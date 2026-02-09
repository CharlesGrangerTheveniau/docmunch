import { describe, it, expect } from "vitest";
import { extractSiteMeta } from "../../src/pipeline/meta-extractor";

const BASE_URL = "https://docs.example.com/getting-started";

describe("extractSiteMeta", () => {
  it("extracts all fields from a rich <head>", () => {
    const html = `
      <html lang="en">
      <head>
        <meta property="og:site_name" content="Acme Docs" />
        <meta property="og:description" content="Official Acme documentation" />
        <meta property="og:image" content="https://docs.example.com/og.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="description" content="Fallback description" />
        <meta name="application-name" content="Acme App" />
        <title>Getting Started - Acme Docs</title>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);

    expect(meta.displayName).toBe("Acme Docs");
    expect(meta.description).toBe("Official Acme documentation");
    expect(meta.iconUrl).toBe("https://docs.example.com/apple-touch-icon.png");
    expect(meta.ogImage).toBe("https://docs.example.com/og.png");
    expect(meta.language).toBe("en");
  });

  it("falls back correctly with minimal HTML", () => {
    const html = `
      <html>
      <head>
        <title>Getting Started - My Docs</title>
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);

    expect(meta.displayName).toBe("Getting Started");
    expect(meta.description).toBe("");
    expect(meta.iconUrl).toBe("https://docs.example.com/favicon.ico");
    expect(meta.ogImage).toBeNull();
    expect(meta.language).toBeNull();
  });

  it("falls back to hostname with empty HTML", () => {
    const html = "<html><head></head><body></body></html>";

    const meta = extractSiteMeta(html, BASE_URL);

    expect(meta.displayName).toBe("docs.example.com");
    expect(meta.description).toBe("");
    expect(meta.iconUrl).toBe("https://docs.example.com/favicon.ico");
    expect(meta.ogImage).toBeNull();
    expect(meta.language).toBeNull();
  });

  it("resolves relative icon and og:image URLs to absolute", () => {
    const html = `
      <html>
      <head>
        <link rel="icon" href="/assets/icon.png" />
        <meta property="og:image" content="/images/og.jpg" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);

    expect(meta.iconUrl).toBe("https://docs.example.com/assets/icon.png");
    expect(meta.ogImage).toBe("https://docs.example.com/images/og.jpg");
  });

  it("treats empty meta tag values as not found", () => {
    const html = `
      <html>
      <head>
        <meta property="og:site_name" content="" />
        <meta property="og:description" content="   " />
        <meta name="description" content="Real description" />
        <meta name="application-name" content="My App" />
        <title>Page Title | Site Name</title>
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);

    // og:site_name is empty → fall through to application-name
    expect(meta.displayName).toBe("My App");
    // og:description is whitespace → fall through to meta description
    expect(meta.description).toBe("Real description");
  });

  it("splits title on various separators", () => {
    const cases = [
      { title: "Intro - Acme Docs", expected: "Intro" },
      { title: "Intro | Acme Docs", expected: "Intro" },
      { title: "Intro — Acme Docs", expected: "Intro" },
      { title: "No Separator Here", expected: "No Separator Here" },
    ];

    for (const { title, expected } of cases) {
      const html = `<html><head><title>${title}</title></head><body></body></html>`;
      const meta = extractSiteMeta(html, BASE_URL);
      expect(meta.displayName).toBe(expected);
    }
  });

  it("prefers apple-touch-icon over other icon types", () => {
    const html = `
      <html>
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);
    expect(meta.iconUrl).toBe("https://docs.example.com/apple-icon.png");
  });

  it("prefers svg icon over generic icon", () => {
    const html = `
      <html>
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);
    expect(meta.iconUrl).toBe("https://docs.example.com/icon.svg");
  });

  it("uses og:locale when html[lang] is absent", () => {
    const html = `
      <html>
      <head>
        <meta property="og:locale" content="fr_FR" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);
    expect(meta.language).toBe("fr_FR");
  });

  it("handles protocol-relative icon URLs", () => {
    const html = `
      <html>
      <head>
        <link rel="icon" href="//cdn.example.com/icon.png" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);
    expect(meta.iconUrl).toBe("https://cdn.example.com/icon.png");
  });

  it("preserves absolute URLs in icon and og:image", () => {
    const html = `
      <html>
      <head>
        <link rel="icon" href="https://cdn.other.com/icon.png" />
        <meta property="og:image" content="https://cdn.other.com/og.jpg" />
      </head>
      <body></body>
      </html>
    `;

    const meta = extractSiteMeta(html, BASE_URL);
    expect(meta.iconUrl).toBe("https://cdn.other.com/icon.png");
    expect(meta.ogImage).toBe("https://cdn.other.com/og.jpg");
  });
});
