import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSchemaTools } from "./tools/schema.js";
import { registerMigrationTools } from "./tools/migration.js";
import { registerDiffTools } from "./tools/diff.js";
import { registerLensTools } from "./tools/lens.js";
import { registerConvertTools } from "./tools/convert.js";
import { registerParseTools } from "./tools/parse.js";
import { registerExprTools } from "./tools/expr.js";
import { registerVcsTools } from "./tools/vcs.js";
import { registerEnrichTools } from "./tools/enrich.js";
import { registerTheoryTools } from "./tools/theory.js";
import { registerResources } from "./resources/protocols.js";
import { registerPrompts } from "./prompts/migration-plan.js";

export async function createServer(): Promise<{
  listen: () => Promise<void>;
}> {
  const server = new McpServer({
    name: "panproto",
    version: "0.10.0",
  });

  // Register all tool groups
  registerSchemaTools(server);
  registerMigrationTools(server);
  registerDiffTools(server);
  registerLensTools(server);
  registerConvertTools(server);
  registerParseTools(server);
  registerExprTools(server);
  registerVcsTools(server);
  registerEnrichTools(server);
  registerTheoryTools(server);

  // Register resources and prompts
  registerResources(server);
  registerPrompts(server);

  return {
    listen: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
