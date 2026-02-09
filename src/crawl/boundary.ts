import { normalizeUrl } from "../utils/url";

export { normalizeUrl };

/**
 * Determine the crawl boundary from a starting URL.
 * Links are in-bounds if they share the same origin and path prefix.
 */
export function getCrawlPrefix(url: string): {
  origin: string;
  pathPrefix: string;
} {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/");
  // Remove the last segment (the current page slug)
  pathParts.pop();
  const pathPrefix = pathParts.join("/") + "/";
  return { origin: parsed.origin, pathPrefix };
}

/**
 * Compute the longest common path prefix between a start URL and discovered nav URLs.
 * Used to widen the crawl boundary when sidebar links span multiple sections.
 */
export function computeCommonPrefix(
  startUrl: string,
  navUrls: string[]
): string {
  const startParts = new URL(startUrl).pathname.split("/").filter(Boolean);
  const parts = [...startParts];

  for (const url of navUrls) {
    const urlParts = new URL(url).pathname.split("/").filter(Boolean);
    let i = 0;
    while (i < parts.length && i < urlParts.length && parts[i] === urlParts[i]) {
      i++;
    }
    parts.length = i;
  }

  return "/" + (parts.length > 0 ? parts.join("/") + "/" : "");
}

/**
 * Check whether a candidate URL falls within the crawl boundary.
 */
export function isInBounds(
  candidateUrl: string,
  origin: string,
  pathPrefix: string
): boolean {
  try {
    const parsed = new URL(candidateUrl);
    return parsed.origin === origin && parsed.pathname.startsWith(pathPrefix);
  } catch {
    return false;
  }
}
