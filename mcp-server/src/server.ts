import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { PolicyEngine } from "./policy/engine.js";
import type { ToolDefinition } from "./tools/types.js";

import { schemaTools } from "./tools/schema.js";
import { migrationTools } from "./tools/migration.js";
import { diffTools } from "./tools/diff.js";
import { lensTools } from "./tools/lens.js";
import { convertTools } from "./tools/convert.js";
import { parseTools } from "./tools/parse.js";
import { exprTools } from "./tools/expr.js";
import { vcsReadTools } from "./tools/vcs.js";
import { vcsWriteTools } from "./tools/vcs-write.js";
import { enrichTools } from "./tools/enrich.js";
import { theoryTools } from "./tools/theory.js";
import { gitBridgeTools } from "./tools/git-bridge.js";
import { auditTools } from "./tools/audit.js";
import { registerResources } from "./resources/protocols.js";
import { registerPrompts } from "./prompts/migration-plan.js";

export async function createServer(): Promise<{
  listen: () => Promise<void>;
}> {
  const policy = new PolicyEngine();

  const server = new McpServer({
    name: "panproto",
    version: "0.15.0",
  });

  const allTools: ToolDefinition[] = [
    ...schemaTools(),
    ...migrationTools(),
    ...diffTools(),
    ...lensTools(),
    ...convertTools(),
    ...parseTools(),
    ...exprTools(),
    ...vcsReadTools(),
    ...vcsWriteTools(),
    ...enrichTools(),
    ...theoryTools(),
    ...gitBridgeTools(),
    ...auditTools(policy),
  ];

  allTools.sort((a, b) => a.name.localeCompare(b.name));

  for (const tool of allTools) {
    server.registerTool(tool.name, {
      title: tool.config.title,
      description: tool.config.description,
      inputSchema: tool.config.inputSchema,
      outputSchema: tool.config.outputSchema,
      annotations: tool.config.annotations,
    }, async (args, extra) => {
      const ctx = extra as { mcpReq?: { elicitInput?: (req: unknown) => Promise<{ action: string; content?: Record<string, unknown> }> } };
      return policy.wrap(
        tool.name,
        args as Record<string, unknown>,
        ctx,
        async (a) => tool.handler(a, extra),
      ) as ReturnType<typeof tool.handler>;
    });
  }

  registerResources(server);
  registerPrompts(server);

  return {
    listen: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
