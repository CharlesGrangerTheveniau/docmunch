import * as cheerio from "cheerio";
import * as readline from "node:readline";
import { fetchPage } from "../pipeline/fetcher";
import {
  getCrawlPrefix,
  computeCommonPrefix,
  isInBounds,
  normalizeUrl,
} from "./boundary";

export interface CrawledPage {
  url: string;
  html: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  effectivePrefix: string;
}

export interface CrawlOptions {
  maxDepth: number;
  navLinkSelector?: string | null;
  /** Custom URL discovery for SPA-rendered sidebars (overrides navLinkSelector) */
  discoverUrls?: (html: string, baseUrl: string) => string[];
  onPageFetched?: (url: string, current: number, total: number) => void;
}

/**
 * Crawl documentation pages starting from a URL.
 * Follows in-bounds links via BFS up to maxDepth.
 * On SIGINT (Ctrl+C), stops gracefully and returns pages collected so far.
 */
export async function crawl(
  startUrl: string,
  options: CrawlOptions
): Promise<CrawlResult> {
  const { origin } = getCrawlPrefix(startUrl);
  let { pathPrefix } = getCrawlPrefix(startUrl);
  const visited = new Set<string>();
  const results: CrawledPage[] = [];
  let isFirstPage = true;
  let interrupted = false;
  let saveOnInterrupt = false;

  const onSigint = async () => {
    if (interrupted) {
      // Second Ctrl+C — force exit
      process.exit(1);
    }
    interrupted = true;

    if (results.length === 0) {
      process.exit(0);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `\nCrawl interrupted. Save ${results.length} page(s) collected so far? (y/n) `,
        resolve
      );
    });
    rl.close();
    saveOnInterrupt = answer.trim().toLowerCase().startsWith("y");
    if (!saveOnInterrupt) {
      process.exit(0);
    }
  };
  process.on("SIGINT", onSigint);

  // BFS queue: [url, depth]
  const queue: [string, number][] = [[startUrl, 0]];
  visited.add(normalizeUrl(startUrl));

  try {
    while (queue.length > 0 && !interrupted) {
      const [url, depth] = queue.shift()!;

      let html: string;
      try {
        html = await fetchPage(url);
      } catch {
        options.onPageFetched?.(url, results.length, results.length + queue.length);
        continue;
      }
      results.push({ url, html });
      options.onPageFetched?.(url, results.length, results.length + queue.length);

      if (depth < options.maxDepth) {
        // On the first page, widen the boundary using nav links (only when a
        // platform-specific navLinkSelector or custom discovery is available —
        // generic sites use all <a> tags which would collapse the prefix to "/")
        if (isFirstPage) {
          const hasNavScope = !!options.navLinkSelector;
          if (hasNavScope) {
            const allNavUrls = options.discoverUrls
              ? discoverSameOriginCustom(html, url, origin, options.discoverUrls)
              : discoverSameOrigin(html, url, origin, options.navLinkSelector);
            if (allNavUrls.length > 0) {
              pathPrefix = computeCommonPrefix(startUrl, allNavUrls);
            }
          }
          isFirstPage = false;
        }

        let links = options.discoverUrls
          ? discoverLinksCustom(html, url, origin, pathPrefix, options.discoverUrls)
          : discoverLinks(html, url, origin, pathPrefix, options.navLinkSelector);

        // If custom discovery found nothing (e.g. no sidebar detected), fall
        // back to scanning all <a> tags. Origin remapping in discoverLinks
        // handles deploy URLs (Vercel, Netlify) pointing to a different origin.
        if (links.length === 0 && options.discoverUrls) {
          links = discoverLinks(html, url, origin, pathPrefix);
        }

        for (const link of links) {
          const normalized = normalizeUrl(link);
          if (!visited.has(normalized)) {
            visited.add(normalized);
            queue.push([link, depth + 1]);
          }
        }
      }

      // Politeness delay between requests
      if (queue.length > 0 && !interrupted) {
        await delay(200);
      }
    }
  } finally {
    process.off("SIGINT", onSigint);
  }

  return { pages: results, effectivePrefix: pathPrefix };
}

/**
 * Extract all in-bounds links from a page's HTML.
 * When navLinkSelector is provided, only links matching that selector are used.
 * Falls back to origin remapping when links match the path prefix but have a
 * foreign origin (e.g. Vercel/Netlify deploy URLs).
 */
function discoverLinks(
  html: string,
  baseUrl: string,
  origin: string,
  pathPrefix: string,
  navLinkSelector?: string | null
): string[] {
  const $ = cheerio.load(html);
  const inBound: string[] = [];
  const foreignPathMatches: string[] = [];
  const selector = navLinkSelector || "a[href]";

  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);
      if (isInBounds(resolved.href, origin, pathPrefix)) {
        inBound.push(resolved.href);
      } else if (resolved.pathname.startsWith(pathPrefix)) {
        foreignPathMatches.push(
          origin + resolved.pathname + resolved.search + resolved.hash
        );
      }
    } catch {
      // Invalid URL, skip
    }
  });

  const result = inBound.length > 0 ? inBound : foreignPathMatches;
  return [...new Set(result)];
}

/**
 * Discover all same-origin links from nav (no path prefix filter).
 * Used on the first page to compute the crawl boundary from nav structure.
 * Remaps foreign-origin links that share the crawl path prefix.
 */
function discoverSameOrigin(
  html: string,
  baseUrl: string,
  origin: string,
  navLinkSelector?: string | null
): string[] {
  const $ = cheerio.load(html);
  const sameOrigin: string[] = [];
  const foreign: string[] = [];
  const selector = navLinkSelector || "a[href]";
  const { pathPrefix } = getCrawlPrefix(baseUrl);

  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === origin) {
        sameOrigin.push(resolved.href);
      } else if (resolved.pathname.startsWith(pathPrefix)) {
        foreign.push(
          origin + resolved.pathname + resolved.search + resolved.hash
        );
      }
    } catch {
      // Invalid URL, skip
    }
  });

  const result = sameOrigin.length > 0 ? sameOrigin : foreign;
  return [...new Set(result)];
}

/**
 * Discover all same-origin links via custom discovery (no path prefix filter).
 * Remaps foreign-origin links that share the crawl path prefix.
 */
function discoverSameOriginCustom(
  html: string,
  baseUrl: string,
  origin: string,
  discoverUrls: (html: string, baseUrl: string) => string[]
): string[] {
  const urls = discoverUrls(html, baseUrl);
  const { pathPrefix } = getCrawlPrefix(baseUrl);
  const sameOrigin: string[] = [];
  const foreign: string[] = [];

  for (const u of urls) {
    try {
      const parsed = new URL(u);
      if (parsed.origin === origin) {
        sameOrigin.push(u);
      } else if (parsed.pathname.startsWith(pathPrefix)) {
        foreign.push(
          origin + parsed.pathname + parsed.search + parsed.hash
        );
      }
    } catch {
      // skip
    }
  }

  const result = sameOrigin.length > 0 ? sameOrigin : foreign;
  return [...new Set(result)];
}

/**
 * Extract in-bounds links using a custom discovery function from the platform strategy.
 * Falls back to origin remapping when links match the path prefix but have a
 * foreign origin (e.g. Vercel/Netlify deploy URLs).
 */
function discoverLinksCustom(
  html: string,
  baseUrl: string,
  origin: string,
  pathPrefix: string,
  discoverUrls: (html: string, baseUrl: string) => string[]
): string[] {
  const urls = discoverUrls(html, baseUrl);
  const inBound = urls.filter((u) => isInBounds(u, origin, pathPrefix));
  if (inBound.length > 0) return [...new Set(inBound)];

  // Remap foreign-origin links that match the expected path structure
  const remapped: string[] = [];
  for (const u of urls) {
    try {
      const parsed = new URL(u);
      if (parsed.pathname.startsWith(pathPrefix)) {
        remapped.push(
          origin + parsed.pathname + parsed.search + parsed.hash
        );
      }
    } catch {
      // skip
    }
  }
  return [...new Set(remapped)];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
