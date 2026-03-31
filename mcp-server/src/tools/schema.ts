import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerSchemaTools(server: McpServer): void {
  server.tool(
    "panproto_validate",
    "Validate a schema file against a protocol's rules",
    {
      schema_path: z.string().describe("Path to the schema file"),
      protocol: z.string().describe("Protocol name (e.g., atproto, openapi, avro)"),
    },
    async ({ schema_path, protocol }) => {
      const result = await execCli(
        "validate",
        "--protocol",
        protocol,
        schema_path
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_normalize",
    "Canonicalize a schema by collapsing reference chains",
    {
      schema_path: z.string().describe("Path to the schema file"),
      protocol: z.string().describe("Protocol name"),
    },
    async ({ schema_path, protocol }) => {
      const result = await execCli(
        "normalize",
        "--protocol",
        protocol,
        schema_path
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_scaffold",
    "Generate a skeleton schema for a protocol",
    {
      protocol: z.string().describe("Protocol name"),
      name: z.string().describe("Schema name"),
    },
    async ({ protocol, name }) => {
      const result = await execCli(
        "scaffold",
        "--protocol",
        protocol,
        `${name}.json`
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
