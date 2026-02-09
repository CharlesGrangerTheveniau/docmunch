import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/** Manifest for a single documentation source (written as _index.json). */
export interface SourceManifest {
  name: string;
  url: string;
  platform: string;
  fetched_at: string;
  pages: { title: string; path: string }[];
}

/** Root manifest listing all sources (written as manifest.json). */
export interface RootManifest {
  sources: { name: string; path: string; fetched_at: string }[];
}

/**
 * Build a source manifest object.
 */
export function buildSourceManifest(
  name: string,
  url: string,
  platform: string,
  pages: { title: string; path: string }[]
): SourceManifest {
  return {
    name,
    url,
    platform,
    fetched_at: new Date().toISOString(),
    pages,
  };
}

/**
 * Write a source manifest (_index.json) to a directory.
 */
export function writeSourceManifest(
  manifest: SourceManifest,
  outputDir: string
): void {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, "_index.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8"
  );
}

/**
 * Load the root manifest (manifest.json) from a directory.
 * Returns an empty manifest if the file doesn't exist.
 */
export function loadRootManifest(rootDir: string): RootManifest {
  try {
    const raw = readFileSync(join(rootDir, "manifest.json"), "utf-8");
    return JSON.parse(raw) as RootManifest;
  } catch {
    return { sources: [] };
  }
}

/**
 * Upsert a source entry in the root manifest and write it to disk.
 */
export function updateRootManifest(
  rootDir: string,
  entry: { name: string; path: string; fetched_at: string }
): void {
  const manifest = loadRootManifest(rootDir);
  const idx = manifest.sources.findIndex((s) => s.name === entry.name);
  if (idx >= 0) {
    manifest.sources[idx] = entry;
  } else {
    manifest.sources.push(entry);
  }
  mkdirSync(rootDir, { recursive: true });
  writeFileSync(
    join(rootDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8"
  );
}
