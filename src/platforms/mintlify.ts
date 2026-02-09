import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

export const mintlify: PlatformStrategy = {
  id: "mintlify",

  detect(url: string, $: CheerioAPI): boolean {
    if ($('meta[name="generator"][content*="Mintlify"]').length > 0) return true;
    if ($("script[src*='mintlify']").length > 0) return true;
    if ($("[data-mintlify]").length > 0) return true;
    return false;
  },

  contentSelector(): string {
    return "article, main";
  },

  removeSelectors(): string[] {
    return [
      "nav",
      "header",
      "footer",
      "[role='navigation']",
      ".sidebar",
      "[class*='sidebar']",
      "[class*='cookie']",
      "[class*='banner']",
      "script",
      "style",
    ];
  },

  navLinkSelector(): string | null {
    return "nav a[href], .sidebar a[href], [class*='sidebar'] a[href]";
  },

  discoverUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const paths = new Set<string>();

    // Mintlify uses Next.js — sidebar nav is in __next_f script data, not <a> tags.
    // The data contains escaped JSON like \"href\":\"/api-reference/checkouts/create\"
    $("script").each((_, el) => {
      const text = $(el).html() || "";
      // Match escaped JSON paths: \"href\":\"/some-path\"
      const escaped = /\\?"href\\?"\s*:\s*\\?"(\/[a-z0-9][a-z0-9\/-]*)\\?"/g;
      let match = escaped.exec(text);
      while (match !== null) {
        paths.add(match[1]);
        match = escaped.exec(text);
      }
    });

    // Resolve to absolute URLs
    const origin = new URL(baseUrl).origin;
    // Determine docs base path (e.g. /docs from /docs/api-reference/intro)
    const basePath = new URL(baseUrl).pathname.split("/").slice(0, 2).join("/");

    return [...paths].map((p) => {
      if (p.startsWith(basePath)) {
        return origin + p;
      }
      return origin + basePath + p;
    });
  },
};
