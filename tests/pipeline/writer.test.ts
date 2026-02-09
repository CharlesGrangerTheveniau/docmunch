import { describe, it, expect, vi, beforeEach } from "vitest";
import { write, writePage, writePages } from "../../src/pipeline/writer";
import { writeFileSync, mkdirSync } from "node:fs";

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("write", () => {
  it("writes to stdout when no output path is given", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    write("# Hello", undefined, {
      sourceUrl: "https://example.com",
      title: "Hello",
      platform: "generic",
    });

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain("https://example.com");
    expect(output).toContain("title: Hello");
    expect(output).toContain("platform: generic");
    expect(output).toContain("docs2ai_version: 0.1.0");
    expect(output).toContain("# Hello");
  });

  it("writes to file when output path is given", () => {
    write("# Test", "/tmp/test.md", {
      sourceUrl: "https://example.com/docs",
      title: "Test",
      platform: "mintlify",
    });

    expect(mkdirSync).toHaveBeenCalledWith("/tmp", { recursive: true });
    expect(writeFileSync).toHaveBeenCalled();
    const content = (writeFileSync as any).mock.calls[0][1] as string;
    expect(content).toContain("https://example.com/docs");
    expect(content).toContain("platform: mintlify");
    expect(content).toContain("# Test");
  });

  it("includes fetched_at timestamp in frontmatter", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    write("content", undefined, {
      sourceUrl: "https://example.com",
      title: "Page",
      platform: "generic",
    });

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain("fetched_at:");
  });
});

describe("writePage", () => {
  it("writes frontmatter and content to the given file path", () => {
    writePage("# Intro", "/out/docs/intro.md", {
      sourceUrl: "https://example.com/docs/intro",
      title: "Intro",
      platform: "mintlify",
    });

    expect(mkdirSync).toHaveBeenCalledWith("/out/docs", { recursive: true });
    expect(writeFileSync).toHaveBeenCalled();
    const content = (writeFileSync as any).mock.calls[0][1] as string;
    expect(content).toContain("https://example.com/docs/intro");
    expect(content).toContain("title: Intro");
    expect(content).toContain("# Intro");
  });
});

describe("writePages", () => {
  it("writes each page to its own file and returns manifest entries", () => {
    const pages = [
      {
        url: "https://x.com/docs/intro",
        title: "Intro",
        platform: "generic",
        markdown: "# Intro",
      },
      {
        url: "https://x.com/docs/guides/auth",
        title: "Auth Guide",
        platform: "generic",
        markdown: "# Auth",
      },
    ];

    const entries = writePages(pages, "/out/example", "/docs/");

    expect(entries).toEqual([
      { title: "Intro", path: "intro.md" },
      { title: "Auth Guide", path: "guides/auth.md" },
    ]);

    // Two writePage calls → two writeFileSync calls
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it("handles slug collisions with numeric suffix", () => {
    const pages = [
      {
        url: "https://x.com/docs/intro",
        title: "Intro 1",
        platform: "generic",
        markdown: "# Intro 1",
      },
      {
        url: "https://x.com/docs/intro",
        title: "Intro 2",
        platform: "generic",
        markdown: "# Intro 2",
      },
    ];

    const entries = writePages(pages, "/out", "/docs/");

    expect(entries[0].path).toBe("intro.md");
    expect(entries[1].path).toBe("intro-2.md");
  });

  it("returns index.md for pages at the base prefix", () => {
    const pages = [
      {
        url: "https://x.com/docs/",
        title: "Overview",
        platform: "generic",
        markdown: "# Overview",
      },
    ];

    const entries = writePages(pages, "/out", "/docs/");
    expect(entries[0].path).toBe("index.md");
  });
});
