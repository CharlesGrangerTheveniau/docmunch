# docmunch

Convert documentation URLs into clean, AI-ready Markdown files. Drop them into your project so AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context.

## Install

```bash
# Run directly
npx docmunch <url>

# Or install globally
npm install -g docmunch
```

## Usage

```bash
# Fetch a single page to stdout
docmunch https://docs.stripe.com/api/charges

# Write to a file
docmunch https://docs.stripe.com/api/charges -o .ai/stripe.md

# Crawl linked pages
docmunch https://docs.stripe.com/api/charges --crawl --max-depth 2 -o .ai/stripe.md

# Manage sources in a config file
docmunch add https://docs.stripe.com/api/charges --name stripe --crawl
docmunch update            # refresh all sources
docmunch update --name stripe  # refresh one
docmunch list              # show configured sources
```

## Features

- **Platform detection** — auto-detects Mintlify, Docusaurus, GitBook, ReadMe, and falls back to Readability for generic sites
- **Code block preservation** — language tags and indentation survive extraction perfectly
- **Crawl mode** — follows sidebar/nav links with configurable depth, scoped to the documentation path
- **Smart fetching** — static fetch by default, auto-retries with Playwright for blocked sites (403, Cloudflare). Playwright is auto-installed on first need
- **Graceful interruption** — press Ctrl+C during a crawl to stop and choose whether to save pages collected so far
- **YAML frontmatter** — each output includes source URL, fetch date, platform, and title
- **Config file** — manage multiple doc sources with `.docmunch.yaml`
- **MCP server** — expose fetched docs to AI tools (Claude Code, Cursor) via Model Context Protocol

## MCP Server

Once you've crawled documentation, `docmunch serve` starts an MCP server that lets AI coding tools query your docs directly.

> **Prerequisite:** Install docmunch globally (`npm install -g docmunch`) or use `npx` to run it without installing. The setup examples below use `npx`, which downloads the package automatically if needed.

### Quick start

```bash
# 1. Crawl some docs
npx docmunch https://docs.stripe.com/api/charges --crawl --name stripe

# 2. Start the MCP server
npx docmunch serve
```

### Claude Code

```bash
claude mcp add --scope project docmunch -- npx docmunch serve -d .ai/docs/
```

That's it. Run `/mcp` inside Claude Code to verify the server is connected.

Use `--scope user` instead to make it available across all your projects.

### Cursor

Open Cursor Settings (`Cmd+,` / `Ctrl+,`) → **MCP** → **+ Add new MCP server**, then:

- **Name**: `docmunch`
- **Type**: `command`
- **Command**: `npx docmunch serve -d .ai/docs/`

Alternatively, create a `.cursor/mcp.json` file at your project root:

```json
{
  "mcpServers": {
    "docmunch": {
      "command": "npx",
      "args": ["docmunch", "serve", "-d", ".ai/docs/"]
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
docmunch serve              # serves .ai/docs/ (default)
docmunch serve -d ./docs/   # custom directory
```

## Config (.docmunch.yaml)

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
