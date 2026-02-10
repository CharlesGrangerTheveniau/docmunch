/** Configuration for a single documentation source. */
export interface SourceConfig {
  name: string;
  url: string;
  crawl: boolean;
  maxDepth: number;
  output: string;
}

/** Top-level .docmunch.yaml configuration. */
export interface DocmunchConfig {
  version: number;
  outputDir: string;
  sources: SourceConfig[];
}
