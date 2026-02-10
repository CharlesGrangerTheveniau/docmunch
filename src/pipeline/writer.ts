import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import matter from "gray-matter";
import { filePathForPage } from "../utils/slug";

export interface WriterOptions {
  sourceUrl: string;
  title: string;
  platform: string;
}

/**
 * Write Markdown with frontmatter to a file or stdout.
 */
export function write(
  markdown: string,
  outputPath: string | undefined,
  options: WriterOptions
): void {
  const content = matter.stringify(markdown, {
    source: options.sourceUrl,
    fetched_at: new Date().toISOString(),
    platform: options.platform,
    title: options.title,
    docmunch_version: "0.2.0",
  });

  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf-8");
  } else {
    process.stdout.write(content);
  }
}

/**
 * Write a single page's Markdown with frontmatter to a file path (always writes to disk).
 */
export function writePage(
  markdown: string,
  filePath: string,
  options: WriterOptions
): void {
  const content = matter.stringify(markdown, {
    source: options.sourceUrl,
    fetched_at: new Date().toISOString(),
    platform: options.platform,
    title: options.title,
    docmunch_version: "0.2.0",
  });

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
}

export interface PageEntry {
  url: string;
  title: string;
  platform: string;
  markdown: string;
}

/**
 * Write multiple crawled pages to a directory, one .md file per page.
 * Returns manifest page entries (title + relative path) for each written page.
 */
export function writePages(
  pages: PageEntry[],
  outputDir: string,
  basePrefix: string
): { title: string; path: string }[] {
  const usedPaths = new Set<string>();
  const entries: { title: string; path: string }[] = [];

  for (const page of pages) {
    let relPath = filePathForPage(page.url, basePrefix);

    // Handle slug collisions by appending a numeric suffix
    if (usedPaths.has(relPath)) {
      const base = relPath.replace(/\.md$/, "");
      let i = 2;
      while (usedPaths.has(`${base}-${i}.md`)) i++;
      relPath = `${base}-${i}.md`;
    }
    usedPaths.add(relPath);

    const filePath = join(outputDir, relPath);
    writePage(page.markdown, filePath, {
      sourceUrl: page.url,
      title: page.title,
      platform: page.platform,
    });

    entries.push({ title: page.title, path: relPath });
  }

  return entries;
}
