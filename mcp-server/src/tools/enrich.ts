import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerEnrichTools(server: McpServer): void {
  server.tool(
    "panproto_enrich_add_default",
    "Add a default value expression to a schema vertex",
    {
      vertex: z.string().describe("Vertex ID to add the default to"),
      expr: z.string().describe("Default value expression as JSON"),
    },
    withErrorBoundary(async ({ vertex, expr }) => {
      const result = await execCli("enrich", "add-default", vertex, "--expr", expr);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_enrich_add_coercion",
    "Add a coercion expression between two vertex kinds",
    {
      from: z.string().describe("Source vertex kind"),
      to: z.string().describe("Target vertex kind"),
      expr: z.string().describe("Coercion expression as JSON"),
    },
    withErrorBoundary(async ({ from, to, expr }) => {
      const result = await execCli("enrich", "add-coercion", from, to, "--expr", expr);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_enrich_list",
    "List all enrichments on the HEAD schema",
    {},
    withErrorBoundary(async () => {
      const result = await execCli("enrich", "list");
      return textContent(result);
    })
  );
}
