import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import yaml from "js-yaml";
import type { DocmunchConfig, SourceConfig } from "./schema";

const CONFIG_FILENAME = ".docmunch.yaml";

/**
 * Load the .docmunch.yaml config file, searching up from cwd.
 * Returns null if no config file is found.
 */
export function loadConfig(startDir?: string): {
  config: DocmunchConfig;
  configPath: string;
} | null {
  const configPath = findConfigFile(startDir || process.cwd());
  if (!configPath) return null;

  const raw = readFileSync(configPath, "utf-8");
  const data = yaml.load(raw) as Record<string, any>;

  const config: DocmunchConfig = {
    version: data.version ?? 1,
    outputDir: data.output_dir ?? ".ai/docs",
    sources: (data.sources ?? []).map(snakeToCamelSource),
  };

  return { config, configPath };
}

/**
 * Save configuration to a .docmunch.yaml file.
 */
export function saveConfig(config: DocmunchConfig, configPath: string): void {
  const data = {
    version: config.version,
    output_dir: config.outputDir,
    sources: config.sources.map(camelToSnakeSource),
  };

  const content = yaml.dump(data, { lineWidth: -1 });
  writeFileSync(configPath, content, "utf-8");
}

/**
 * Add or update a source in the config (upsert by name).
 */
export function addSource(config: DocmunchConfig, source: SourceConfig): void {
  const idx = config.sources.findIndex((s) => s.name === source.name);
  if (idx >= 0) {
    config.sources[idx] = source;
  } else {
    config.sources.push(source);
  }
}

/**
 * Walk up the directory tree looking for .docmunch.yaml.
 */
function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function snakeToCamelSource(s: Record<string, any>): SourceConfig {
  return {
    name: s.name ?? "",
    url: s.url ?? "",
    crawl: s.crawl ?? false,
    maxDepth: s.max_depth ?? 2,
    output: s.output ?? "",
  };
}

function camelToSnakeSource(
  s: SourceConfig
): Record<string, string | number | boolean> {
  return {
    name: s.name,
    url: s.url,
    crawl: s.crawl,
    max_depth: s.maxDepth,
    output: s.output,
  };
}
