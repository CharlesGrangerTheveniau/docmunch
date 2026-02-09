/**
 * Derive a filename slug from a URL's pathname.
 * Strips leading/trailing slashes and returns the last segment.
 */
export function slugFromPathname(url: string): string {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (!pathname || pathname === "/") return "index";
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1];
}

/**
 * Compute a relative file path for a crawled page based on its URL and a base prefix.
 * Strips the basePrefix from the pathname, intermediate segments become subdirectories,
 * and the last segment becomes the filename with .md extension.
 *
 * @example filePathForPage("https://x.com/docs/guides/auth", "/docs/") → "guides/auth.md"
 * @example filePathForPage("https://x.com/docs/getting-started", "/docs/") → "getting-started.md"
 * @example filePathForPage("https://x.com/docs/", "/docs/") → "index.md"
 */
export function filePathForPage(pageUrl: string, basePrefix: string): string {
  const parsed = new URL(pageUrl);
  let pathname = parsed.pathname.replace(/\/+$/, "");

  // Strip the base prefix
  const normalizedPrefix = basePrefix.replace(/\/+$/, "");
  if (pathname.startsWith(normalizedPrefix)) {
    pathname = pathname.slice(normalizedPrefix.length);
  }

  // Remove leading slash
  pathname = pathname.replace(/^\/+/, "");

  if (!pathname) return "index.md";

  return pathname + ".md";
}
