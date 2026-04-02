import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerLensTools(server: McpServer): void {
  server.tool(
    "panproto_lens_generate",
    "Auto-generate a bidirectional protolens chain between two schemas",
    {
      old_schema: z.string().describe("Path to old/source schema"),
      new_schema: z.string().describe("Path to new/target schema"),
      protocol: z.string().describe("Protocol name"),
      json: z.boolean().optional().describe("Output as JSON"),
      save: z.string().optional().describe("Save protolens chain to this file path"),
      hints: z.string().optional().describe("Path to a HintSpec JSON file for guided auto-lens generation (anchors, scope constraints, exclusions, scoring preferences)"),
    },
    withErrorBoundary(async ({ old_schema, new_schema, protocol, json, save, hints }) => {
      const args = ["lens", "generate", "--protocol", protocol];
      if (json) args.push("--json");
      if (save) args.push("--save", save);
      if (hints) args.push("--hints", hints);
      args.push(old_schema, new_schema);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_lens_apply",
    "Apply a protolens chain to data (forward or backward direction)",
    {
      chain: z.string().describe("Path to protolens chain JSON file"),
      data: z.string().describe("Path to data record"),
      protocol: z.string().describe("Protocol name"),
      direction: z.enum(["forward", "backward"]).optional().describe("Direction (default: forward)"),
      complement: z.string().optional().describe("Path to complement data (for backward apply)"),
      schema: z.string().optional().describe("Schema for chain instantiation"),
    },
    withErrorBoundary(async ({ chain, data, protocol, direction, complement, schema }) => {
      const args = ["lens", "apply", "--protocol", protocol];
      if (direction) args.push("--direction", direction);
      if (complement) args.push("--complement", complement);
      if (schema) args.push("--schema", schema);
      args.push(chain, data);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_lens_verify",
    "Verify lens round-trip laws (GetPut and PutGet) on test data",
    {
      data: z.string().describe("Path to test data file"),
      protocol: z.string().describe("Protocol name"),
      schema: z.string().optional().describe("Path to schema file"),
    },
    withErrorBoundary(async ({ data, protocol, schema }) => {
      const args = ["lens", "verify", "--protocol", protocol];
      if (schema) args.push("--schema", schema);
      args.push(data);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_lens_compose",
    "Compose two protolens chains or schemas into a single chain",
    {
      chain1: z.string().describe("Path to first chain or schema"),
      chain2: z.string().describe("Path to second chain or schema"),
      protocol: z.string().describe("Protocol name"),
      json: z.boolean().optional().describe("Output as JSON"),
    },
    withErrorBoundary(async ({ chain1, chain2, protocol, json }) => {
      const args = ["lens", "compose", "--protocol", protocol];
      if (json) args.push("--json");
      args.push(chain1, chain2);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_lens_inspect",
    "Inspect a protolens chain showing each step, preconditions, and effects",
    {
      chain: z.string().describe("Path to protolens chain JSON"),
      protocol: z.string().describe("Protocol name"),
    },
    withErrorBoundary(async ({ chain, protocol }) => {
      const result = await execCli("lens", "inspect", "--protocol", protocol, chain);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_lens_pipeline",
    "Build a protolens chain from combinator steps (rename_field, remove_field, add_field, scoped/map_items, hoist_field, nest_field). Supports dependent optics: scoped transforms apply inner transforms to sub-schemas with optic kind determined by edge type (prop→Lens, item→Traversal, variant→Prism).",
    {
      steps: z.string().describe("JSON array of pipeline steps, e.g. [{\"type\":\"rename_field\",\"old\":\"name\",\"new\":\"displayName\"},{\"type\":\"map_items\",\"focus\":\"words\",\"inner\":[{\"type\":\"add_field\",\"name\":\"confidence\",\"kind\":\"number\",\"default\":1.0}]}]"),
      protocol: z.string().describe("Protocol name"),
      schema: z.string().optional().describe("Path to schema for instantiation"),
      save: z.string().optional().describe("Save pipeline chain to this file path"),
    },
    withErrorBoundary(async ({ steps, protocol, schema, save }) => {
      const args = ["lens", "pipeline", "--protocol", protocol, "--steps", steps];
      if (schema) args.push("--schema", schema);
      if (save) args.push("--save", save);
      const result = await execCli(...args);
      return textContent(result);
    })
  );
}
