import { defineCommand } from "citty";
import { resolve } from "node:path";

export const serveCommand = defineCommand({
  meta: {
    name: "serve",
    description: "Start an MCP server exposing documentation tools",
  },
  args: {
    dir: {
      type: "string",
      alias: "d",
      description: "Documentation directory to serve",
      default: ".ai/docs/",
    },
    registry: {
      type: "boolean",
      description: "Stream docs from the hosted registry instead of local files",
      default: false,
    },
    team: {
      type: "string",
      description: "Team slug for scoped private registry access",
    },
  },
  async run({ args }) {
    const docsDir = resolve(process.cwd(), args.dir as string);
    const registry = args.registry as boolean;
    const team = args.team as string | undefined;
    const registryUrl =
      process.env.DOCMUNCH_REGISTRY_URL || "https://docmunch.dev";
    const token = process.env.DOCMUNCH_TOKEN || undefined;

    const { createMcpServer } = await import("../mcp/server");
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );

    const server = createMcpServer(docsDir, {
      registry: registry
        ? { url: registryUrl, token, team }
        : undefined,
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  },
});
