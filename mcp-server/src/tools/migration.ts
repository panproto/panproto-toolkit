import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerMigrationTools(server: McpServer): void {
  server.tool(
    "panproto_check_existence",
    "Check if a migration between two schemas satisfies existence conditions",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
      mapping: z.string().describe("Path to migration mapping file"),
      typecheck: z.boolean().optional().describe("Also type-check at the GAT level"),
    },
    withErrorBoundary(async ({ src, tgt, mapping, typecheck }) => {
      const args = ["check", "--src", src, "--tgt", tgt, "--mapping", mapping];
      if (typecheck) args.push("--typecheck");
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_lift",
    "Apply a migration to a data record, transforming it from source to target schema",
    {
      migration: z.string().describe("Path to migration mapping file"),
      src_schema: z.string().describe("Path to source schema"),
      tgt_schema: z.string().describe("Path to target schema"),
      record: z.string().describe("Path to the data record"),
      direction: z.enum(["restrict", "sigma", "pi"]).optional().describe("Migration direction (default: restrict)"),
    },
    withErrorBoundary(async ({ migration, src_schema, tgt_schema, record, direction }) => {
      const args = [
        "lift", "--migration", migration,
        "--src-schema", src_schema, "--tgt-schema", tgt_schema,
      ];
      if (direction) args.push("--direction", direction);
      args.push(record);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_auto_migrate",
    "Automatically discover a migration morphism between two schemas via CSP search. Runs the 14-strategy alignment ladder (user_hint, exact, exact_suffix, edge_label, alias, token_similarity, description_similarity, type_signature, wrap_unwrap, coerce, neighborhood, wl_refinement, structural, llm) and emits an alignmentStrategies summary (0.39.0+) keyed by these tags.",
    {
      old_schema: z.string().describe("Path to old/source schema"),
      new_schema: z.string().describe("Path to new/target schema"),
      json: z.boolean().optional().describe("Output as JSON"),
      monic: z.boolean().optional().describe("Require injective vertex mapping"),
    },
    withErrorBoundary(async ({ old_schema, new_schema, json, monic }) => {
      const args = ["auto-migrate"];
      if (json) args.push("--json");
      if (monic) args.push("--monic");
      args.push(old_schema, new_schema);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_integrate",
    "Compute the pushout (integration) of two schemas, merging them into one",
    {
      left: z.string().describe("Path to left schema"),
      right: z.string().describe("Path to right schema"),
      auto_overlap: z.boolean().optional().describe("Auto-discover overlap between schemas"),
      json: z.boolean().optional().describe("Output as JSON"),
    },
    withErrorBoundary(async ({ left, right, auto_overlap, json }) => {
      const args = ["integrate"];
      if (auto_overlap) args.push("--auto-overlap");
      if (json) args.push("--json");
      args.push(left, right);
      const result = await execCli(...args);
      return textContent(result);
    })
  );
}
