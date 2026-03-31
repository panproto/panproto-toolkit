import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerSchemaTools(server: McpServer): void {
  server.tool(
    "panproto_validate",
    "Validate a schema file against a protocol's rules",
    {
      schema_path: z.string().describe("Path to the schema file"),
      protocol: z.string().describe("Protocol name (e.g., atproto, openapi, avro)"),
    },
    withErrorBoundary(async ({ schema_path, protocol }) => {
      const result = await execCli("validate", "--protocol", protocol, schema_path);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_normalize",
    "Canonicalize a schema by collapsing reference chains and simplifying structure",
    {
      schema_path: z.string().describe("Path to the schema file"),
      protocol: z.string().describe("Protocol name"),
      json: z.boolean().optional().describe("Output as JSON"),
    },
    withErrorBoundary(async ({ schema_path, protocol, json }) => {
      const args = ["normalize", "--protocol", protocol];
      if (json) args.push("--json");
      args.push(schema_path);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_scaffold",
    "Generate minimal test data from a protocol theory using free model construction",
    {
      protocol: z.string().describe("Protocol name"),
      schema_path: z.string().describe("Path to the schema file"),
      json: z.boolean().optional().describe("Output as JSON"),
    },
    withErrorBoundary(async ({ protocol, schema_path, json }) => {
      const args = ["scaffold", "--protocol", protocol];
      if (json) args.push("--json");
      args.push(schema_path);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_typecheck",
    "Type-check a migration morphism at the GAT level",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
      migration: z.string().describe("Path to migration mapping file"),
    },
    withErrorBoundary(async ({ src, tgt, migration }) => {
      const result = await execCli(
        "typecheck", "--src", src, "--tgt", tgt, "--migration", migration
      );
      return textContent(result);
    })
  );

  server.tool(
    "panproto_health",
    "Check that the panproto CLI is installed and report its version",
    {},
    withErrorBoundary(async () => {
      const version = await execCli("--version");
      return textContent(`OK: ${version}`);
    })
  );
}
