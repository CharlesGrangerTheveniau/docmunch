import * as cheerio from "cheerio";
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

  // BFS queue: [url, depth]
  const queue: [string, number][] = [[startUrl, 0]];
  visited.add(normalizeUrl(startUrl));

  while (queue.length > 0) {
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
        const hasNavScope = !!options.navLinkSelector || !!options.discoverUrls;
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

      const links = options.discoverUrls
        ? discoverLinksCustom(html, url, origin, pathPrefix, options.discoverUrls)
        : discoverLinks(html, url, origin, pathPrefix, options.navLinkSelector);
      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (!visited.has(normalized)) {
          visited.add(normalized);
          queue.push([link, depth + 1]);
        }
      }
    }

    // Politeness delay between requests
    if (queue.length > 0) {
      await delay(200);
    }
  }

  return { pages: results, effectivePrefix: pathPrefix };
}

/**
 * Extract all in-bounds links from a page's HTML.
 * When navLinkSelector is provided, only links matching that selector are used.
 */
function discoverLinks(
  html: string,
  baseUrl: string,
  origin: string,
  pathPrefix: string,
  navLinkSelector?: string | null
): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const selector = navLinkSelector || "a[href]";

  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl).href;
      if (isInBounds(resolved, origin, pathPrefix)) {
        links.push(resolved);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(links)];
}

/**
 * Discover all same-origin links from nav (no path prefix filter).
 * Used on the first page to compute the crawl boundary from nav structure.
 */
function discoverSameOrigin(
  html: string,
  baseUrl: string,
  origin: string,
  navLinkSelector?: string | null
): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const selector = navLinkSelector || "a[href]";

  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl).href;
      if (new URL(resolved).origin === origin) {
        links.push(resolved);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(links)];
}

/**
 * Discover all same-origin links via custom discovery (no path prefix filter).
 */
function discoverSameOriginCustom(
  html: string,
  baseUrl: string,
  origin: string,
  discoverUrls: (html: string, baseUrl: string) => string[]
): string[] {
  const urls = discoverUrls(html, baseUrl);
  return [
    ...new Set(
      urls.filter((u) => {
        try {
          return new URL(u).origin === origin;
        } catch {
          return false;
        }
      })
    ),
  ];
}

/**
 * Extract in-bounds links using a custom discovery function from the platform strategy.
 */
function discoverLinksCustom(
  html: string,
  baseUrl: string,
  origin: string,
  pathPrefix: string,
  discoverUrls: (html: string, baseUrl: string) => string[]
): string[] {
  const urls = discoverUrls(html, baseUrl);
  return [...new Set(urls.filter((u) => isInBounds(u, origin, pathPrefix)))];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
