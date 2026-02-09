import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSourceManifest,
  writeSourceManifest,
  loadRootManifest,
  updateRootManifest,
} from "../../src/pipeline/manifest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildSourceManifest", () => {
  it("creates a manifest with all fields", () => {
    const pages = [
      { title: "Intro", path: "intro.md" },
      { title: "Auth", path: "guides/auth.md" },
    ];
    const manifest = buildSourceManifest("example", "https://example.com/docs", "mintlify", pages);

    expect(manifest.name).toBe("example");
    expect(manifest.url).toBe("https://example.com/docs");
    expect(manifest.platform).toBe("mintlify");
    expect(manifest.pages).toEqual(pages);
    expect(manifest.fetched_at).toBeTruthy();
    // Without siteMeta, optional fields should be absent
    expect(manifest.display_name).toBeUndefined();
    expect(manifest.description).toBeUndefined();
    expect(manifest.icon_url).toBeUndefined();
  });

  it("includes site meta fields when siteMeta is provided", () => {
    const pages = [{ title: "Intro", path: "intro.md" }];
    const siteMeta = {
      displayName: "Acme Docs",
      description: "Official docs",
      iconUrl: "https://example.com/icon.png",
      ogImage: "https://example.com/og.png",
      language: "en",
    };
    const manifest = buildSourceManifest(
      "example",
      "https://example.com/docs",
      "mintlify",
      pages,
      siteMeta
    );

    expect(manifest.display_name).toBe("Acme Docs");
    expect(manifest.description).toBe("Official docs");
    expect(manifest.icon_url).toBe("https://example.com/icon.png");
    expect(manifest.og_image).toBe("https://example.com/og.png");
    expect(manifest.language).toBe("en");
    expect(manifest.page_count).toBe(1);
  });
});

describe("writeSourceManifest", () => {
  it("writes _index.json to the output directory", () => {
    const manifest = buildSourceManifest("test", "https://x.com", "generic", []);
    writeSourceManifest(manifest, "/out/test");

    expect(mkdirSync).toHaveBeenCalledWith("/out/test", { recursive: true });
    expect(writeFileSync).toHaveBeenCalled();
    const [path, content] = (writeFileSync as any).mock.calls[0];
    expect(path).toBe("/out/test/_index.json");
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("test");
    expect(parsed.pages).toEqual([]);
  });
});

describe("loadRootManifest", () => {
  it("returns parsed manifest when file exists", () => {
    const data = { sources: [{ name: "a", path: "a/", fetched_at: "2025-01-01" }] };
    (readFileSync as any).mockReturnValue(JSON.stringify(data));

    const result = loadRootManifest("/out");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].name).toBe("a");
  });

  it("returns empty manifest when file does not exist", () => {
    (readFileSync as any).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const result = loadRootManifest("/out");
    expect(result.sources).toEqual([]);
  });
});

describe("updateRootManifest", () => {
  it("adds a new entry when name does not exist", () => {
    (readFileSync as any).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    updateRootManifest("/out", { name: "new", path: "new/", fetched_at: "2025-01-01" });

    expect(writeFileSync).toHaveBeenCalled();
    const content = (writeFileSync as any).mock.calls[0][1];
    const parsed = JSON.parse(content);
    expect(parsed.sources).toHaveLength(1);
    expect(parsed.sources[0].name).toBe("new");
  });

  it("upserts an existing entry by name", () => {
    const existing = {
      sources: [{ name: "old", path: "old/", fetched_at: "2024-01-01" }],
    };
    (readFileSync as any).mockReturnValue(JSON.stringify(existing));

    updateRootManifest("/out", { name: "old", path: "old/", fetched_at: "2025-06-01" });

    const content = (writeFileSync as any).mock.calls[0][1];
    const parsed = JSON.parse(content);
    expect(parsed.sources).toHaveLength(1);
    expect(parsed.sources[0].fetched_at).toBe("2025-06-01");
  });
});
