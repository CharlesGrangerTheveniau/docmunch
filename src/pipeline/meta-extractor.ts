import * as cheerio from "cheerio";

/** Site-level metadata extracted from a page's <head>. */
export interface SiteMeta {
  displayName: string;
  description: string;
  iconUrl: string | null;
  ogImage: string | null;
  language: string | null;
}

/**
 * Extract site metadata from an HTML page's <head> element.
 * Pure function — no side effects or network calls.
 */
export function extractSiteMeta(html: string, url: string): SiteMeta {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  return {
    displayName: extractDisplayName($, url),
    description: extractDescription($),
    iconUrl: extractIconUrl($, origin),
    ogImage: extractOgImage($, origin),
    language: extractLanguage($),
  };
}

function nonEmpty(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function extractDisplayName($: cheerio.CheerioAPI, url: string): string {
  const ogSiteName = nonEmpty($('meta[property="og:site_name"]').attr("content"));
  if (ogSiteName) return ogSiteName;

  const appName = nonEmpty($('meta[name="application-name"]').attr("content"));
  if (appName) return appName;

  const title = nonEmpty($("title").text());
  if (title) {
    const parts = title.split(/\s[-|—]\s/);
    return parts[0].trim();
  }

  return new URL(url).hostname;
}

function extractDescription($: cheerio.CheerioAPI): string {
  const ogDesc = nonEmpty($('meta[property="og:description"]').attr("content"));
  if (ogDesc) return ogDesc;

  const metaDesc = nonEmpty($('meta[name="description"]').attr("content"));
  if (metaDesc) return metaDesc;

  return "";
}

function extractIconUrl($: cheerio.CheerioAPI, origin: string): string | null {
  const selectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
  ];

  for (const selector of selectors) {
    const href = nonEmpty($(selector).attr("href"));
    if (href) return resolveUrl(href, origin);
  }

  return `${origin}/favicon.ico`;
}

function extractOgImage($: cheerio.CheerioAPI, origin: string): string | null {
  const ogImage = nonEmpty($('meta[property="og:image"]').attr("content"));
  if (ogImage) return resolveUrl(ogImage, origin);

  return null;
}

function extractLanguage($: cheerio.CheerioAPI): string | null {
  const htmlLang = nonEmpty($("html").attr("lang"));
  if (htmlLang) return htmlLang;

  const ogLocale = nonEmpty($('meta[property="og:locale"]').attr("content"));
  if (ogLocale) return ogLocale;

  return null;
}

function resolveUrl(href: string, origin: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${origin}/${href}`;
}
