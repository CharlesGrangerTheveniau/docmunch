import { defineCommand } from "citty";
import { join } from "node:path";
import consola from "consola";
import { loadConfig, saveConfig, addSource } from "../config/manager";
import type { Docs2aiConfig } from "../config/schema";
import { slugFromUrl } from "../utils/url";

export const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Add a documentation source to .docs2ai.yaml",
  },
  args: {
    url: {
      type: "positional",
      description: "Documentation URL to add",
      required: true,
    },
    name: {
      type: "string",
      description: "Name for this source (auto-derived from hostname if omitted)",
    },
    crawl: {
      type: "boolean",
      description: "Enable crawl mode for this source",
      default: false,
    },
    "max-depth": {
      type: "string",
      description: "Maximum crawl depth",
      default: "2",
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output filename or directory",
    },
  },
  run({ args }) {
    const url = args.url as string;
    const shouldCrawl = args.crawl as boolean;
    const maxDepth = parseInt(args["max-depth"] as string, 10);

    const name = (args.name as string) || slugFromUrl(url);
    const output =
      (args.output as string) || (shouldCrawl ? `${name}/` : `${name}.md`);

    const existing = loadConfig();
    let config: Docs2aiConfig;
    let configPath: string;

    if (existing) {
      config = existing.config;
      configPath = existing.configPath;
    } else {
      configPath = join(process.cwd(), ".docs2ai.yaml");
      config = { version: 1, outputDir: ".ai/docs", sources: [] };
    }

    addSource(config, { name, url, crawl: shouldCrawl, maxDepth, output });
    saveConfig(config, configPath);

    consola.success(`Added source "${name}" → ${url}`);
    consola.info(`Config: ${configPath}`);
  },
});
