import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { SiteMeta } from "./meta-extractor";

/** Manifest for a single documentation source (written as _index.json). */
export interface SourceManifest {
  name: string;
  url: string;
  platform: string;
  fetched_at: string;
  pages: { title: string; path: string }[];
  display_name?: string;
  description?: string;
  icon_url?: string | null;
  og_image?: string | null;
  language?: string | null;
  page_count?: number;
}

/** Entry in the root manifest's sources array. */
export interface RootManifestEntry {
  name: string;
  path: string;
  fetched_at: string;
  display_name?: string;
  description?: string;
  icon_url?: string | null;
  page_count?: number;
}

/** Root manifest listing all sources (written as manifest.json). */
export interface RootManifest {
  sources: RootManifestEntry[];
}

/**
 * Build a source manifest object.
 * When siteMeta is provided, its fields are included in the manifest.
 */
export function buildSourceManifest(
  name: string,
  url: string,
  platform: string,
  pages: { title: string; path: string }[],
  siteMeta?: SiteMeta
): SourceManifest {
  const manifest: SourceManifest = {
    name,
    url,
    platform,
    fetched_at: new Date().toISOString(),
    pages,
  };

  if (siteMeta) {
    manifest.display_name = siteMeta.displayName;
    manifest.description = siteMeta.description;
    manifest.icon_url = siteMeta.iconUrl;
    manifest.og_image = siteMeta.ogImage;
    manifest.language = siteMeta.language;
    manifest.page_count = pages.length;
  }

  return manifest;
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
  entry: RootManifestEntry
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
