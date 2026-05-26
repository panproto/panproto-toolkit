import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function schemaTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_validate",
      config: {
        title: TOOL_CATALOG.panproto_validate.title,
        description: "Validate a schema file against a protocol's rules",
        inputSchema: z.object({
          schema_path: z.string().describe("Path to the schema file"),
          protocol: z.string().describe("Protocol name (e.g., atproto, openapi, avro)"),
        }),
        annotations: TOOL_CATALOG.panproto_validate.annotations,
      },
      handler: withErrorBoundary(async ({ schema_path, protocol }) => {
        const result = await execCli("validate", "--protocol", protocol as string, schema_path as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_normalize",
      config: {
        title: TOOL_CATALOG.panproto_normalize.title,
        description: "Canonicalize a schema by collapsing reference chains and simplifying structure",
        inputSchema: z.object({
          schema_path: z.string().describe("Path to the schema file"),
          protocol: z.string().describe("Protocol name"),
          json: z.boolean().optional().describe("Output as JSON"),
          identify: z.string().optional().describe("Comma-separated element pairs to identify, e.g. A=B,C=D"),
        }),
        annotations: TOOL_CATALOG.panproto_normalize.annotations,
      },
      handler: withErrorBoundary(async ({ schema_path, protocol, json, identify }) => {
        const args = ["normalize", "--protocol", protocol as string];
        if (json) args.push("--json");
        if (identify) args.push("--identify", identify as string);
        args.push(schema_path as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_scaffold",
      config: {
        title: TOOL_CATALOG.panproto_scaffold.title,
        description: "Generate minimal test data from a protocol theory using free model construction",
        inputSchema: z.object({
          protocol: z.string().describe("Protocol name"),
          schema_path: z.string().describe("Path to the schema file"),
          json: z.boolean().optional().describe("Output as JSON"),
          depth: z.number().optional().describe("Maximum depth for free model construction (default: 3)"),
          max_terms: z.number().optional().describe("Maximum number of terms to generate (default: 1000)"),
        }),
        annotations: TOOL_CATALOG.panproto_scaffold.annotations,
      },
      handler: withErrorBoundary(async ({ protocol, schema_path, json, depth, max_terms }) => {
        const args = ["scaffold", "--protocol", protocol as string];
        if (json) args.push("--json");
        if (depth !== undefined) args.push("--depth", String(depth));
        if (max_terms !== undefined) args.push("--max-terms", String(max_terms));
        args.push(schema_path as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_typecheck",
      config: {
        title: TOOL_CATALOG.panproto_typecheck.title,
        description: "Type-check a migration morphism at the GAT level",
        inputSchema: z.object({
          src: z.string().describe("Path to source schema"),
          tgt: z.string().describe("Path to target schema"),
          migration: z.string().describe("Path to migration mapping file"),
        }),
        annotations: TOOL_CATALOG.panproto_typecheck.annotations,
      },
      handler: withErrorBoundary(async ({ src, tgt, migration }) => {
        const result = await execCli(
          "typecheck", "--src", src as string, "--tgt", tgt as string, "--migration", migration as string,
        );
        return textContent(result);
      }),
    },
    {
      name: "panproto_health",
      config: {
        title: TOOL_CATALOG.panproto_health.title,
        description: "Check that the panproto CLI is installed and report its version",
        inputSchema: z.object({}),
        annotations: TOOL_CATALOG.panproto_health.annotations,
        outputSchema: z.object({
          status: z.string(),
          version: z.string(),
        }),
      },
      handler: withErrorBoundary(async () => {
        const version = await execCli("--version");
        const output = { status: "ok", version: version.trim() };
        return {
          content: [{ type: "text" as const, text: `OK: ${version}` }],
          structuredContent: output,
        };
      }),
    },
    {
      name: "panproto_verify",
      config: {
        title: TOOL_CATALOG.panproto_verify.title,
        description: "Verify that a schema satisfies all equations in the protocol theory (sample-based check)",
        inputSchema: z.object({
          schema_path: z.string().describe("Path to the schema file"),
          protocol: z.string().describe("Protocol name"),
          max_assignments: z.number().optional().describe("Maximum number of variable assignments to test (default: 10000)"),
        }),
        annotations: TOOL_CATALOG.panproto_verify.annotations,
      },
      handler: withErrorBoundary(async ({ schema_path, protocol, max_assignments }) => {
        const args = ["verify", "--protocol", protocol as string];
        if (max_assignments) args.push("--max-assignments", String(max_assignments));
        args.push(schema_path as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
  ];
}
