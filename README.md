# docs2ai

Convert documentation URLs into clean, AI-ready Markdown files. Drop them into your project so AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context.

## Install

```bash
# Run directly
npx docs2ai <url>

# Or install globally
npm install -g docs2ai
```

## Usage

```bash
# Fetch a single page to stdout
docs2ai https://docs.stripe.com/api/charges

# Write to a file
docs2ai https://docs.stripe.com/api/charges -o .ai/stripe.md

# Crawl linked pages
docs2ai https://docs.stripe.com/api/charges --crawl --max-depth 2 -o .ai/stripe.md

# Manage sources in a config file
docs2ai add https://docs.stripe.com/api/charges --name stripe --crawl
docs2ai update            # refresh all sources
docs2ai update --name stripe  # refresh one
docs2ai list              # show configured sources
```

## Features

- **Platform detection** — auto-detects Mintlify, Docusaurus, GitBook, ReadMe, and falls back to Readability for generic sites
- **Code block preservation** — language tags and indentation survive extraction perfectly
- **Crawl mode** — follows sidebar/nav links with configurable depth, scoped to the documentation path
- **Smart fetching** — static fetch by default, auto-retries with Playwright for blocked sites (403, Cloudflare). Playwright is auto-installed on first need
- **Graceful interruption** — press Ctrl+C during a crawl to stop and choose whether to save pages collected so far
- **YAML frontmatter** — each output includes source URL, fetch date, platform, and title
- **Config file** — manage multiple doc sources with `.docs2ai.yaml`
- **MCP server** — expose fetched docs to AI tools (Claude Code, Cursor) via Model Context Protocol

## MCP Server

Once you've crawled documentation, `docs2ai serve` starts an MCP server that lets AI coding tools query your docs directly.

> **Prerequisite:** Install docs2ai globally (`npm install -g docs2ai`) or use `npx` to run it without installing. The setup examples below use `npx`, which downloads the package automatically if needed.

### Quick start

```bash
# 1. Crawl some docs
npx docs2ai https://docs.stripe.com/api/charges --crawl --name stripe

# 2. Start the MCP server
npx docs2ai serve
```

### Claude Code

```bash
claude mcp add --scope project docs2ai -- npx docs2ai serve -d .ai/docs/
```

That's it. Run `/mcp` inside Claude Code to verify the server is connected.

Use `--scope user` instead to make it available across all your projects.

### Cursor

Open Cursor Settings (`Cmd+,` / `Ctrl+,`) → **MCP** → **+ Add new MCP server**, then:

- **Name**: `docs2ai`
- **Type**: `command`
- **Command**: `npx docs2ai serve -d .ai/docs/`

Alternatively, create a `.cursor/mcp.json` file at your project root:

```json
{
  "mcpServers": {
    "docs2ai": {
      "command": "npx",
      "args": ["docs2ai", "serve", "-d", ".ai/docs/"]
    }
  }
}
```

Restart Cursor for the server to be picked up. A green dot next to the server name in Settings → MCP confirms it's running.

### Available tools

Once connected, your AI assistant has access to:

- **`list_sources`** — see all available documentation sources
- **`list_pages`** — list pages within a source
- **`read_page`** — read the full markdown content of a page
- **`search_docs`** — full-text search across all docs

### Options

```bash
docs2ai serve              # serves .ai/docs/ (default)
docs2ai serve -d ./docs/   # custom directory
```

## Config (.docs2ai.yaml)

```yaml
version: 1
output_dir: .ai/docs
sources:
  - name: stripe
    url: https://docs.stripe.com/api/charges
    crawl: true
    max_depth: 2
    output: stripe.md
  - name: yousign
    url: https://developers.yousign.com/docs/set-up-your-account
    crawl: false
    output: yousign.md
```

## License

MIT
