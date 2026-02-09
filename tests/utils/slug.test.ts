import { describe, it, expect } from "vitest";
import { slugFromPathname, filePathForPage } from "../../src/utils/slug";

describe("slugFromPathname", () => {
  it("returns last path segment", () => {
    expect(slugFromPathname("https://example.com/docs/set-up-your-account")).toBe(
      "set-up-your-account"
    );
  });

  it("returns index for root path", () => {
    expect(slugFromPathname("https://example.com/")).toBe("index");
    expect(slugFromPathname("https://example.com")).toBe("index");
  });

  it("handles deep paths", () => {
    expect(slugFromPathname("https://example.com/docs/api/v2/charges")).toBe("charges");
  });

  it("strips trailing slashes", () => {
    expect(slugFromPathname("https://example.com/docs/intro/")).toBe("intro");
  });
});

describe("filePathForPage", () => {
  it("strips base prefix and adds .md", () => {
    expect(filePathForPage("https://x.com/docs/getting-started", "/docs/")).toBe(
      "getting-started.md"
    );
  });

  it("preserves intermediate directory segments", () => {
    expect(filePathForPage("https://x.com/docs/guides/auth", "/docs/")).toBe("guides/auth.md");
  });

  it("returns index.md when page matches the prefix exactly", () => {
    expect(filePathForPage("https://x.com/docs/", "/docs/")).toBe("index.md");
    expect(filePathForPage("https://x.com/docs", "/docs/")).toBe("index.md");
  });

  it("handles deep nesting", () => {
    expect(filePathForPage("https://x.com/docs/api/v2/charges", "/docs/")).toBe(
      "api/v2/charges.md"
    );
  });

  it("handles prefix without trailing slash", () => {
    expect(filePathForPage("https://x.com/docs/intro", "/docs")).toBe("intro.md");
  });

  it("handles root prefix", () => {
    expect(filePathForPage("https://x.com/about", "/")).toBe("about.md");
  });
});
