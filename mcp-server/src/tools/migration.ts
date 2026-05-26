import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function migrationTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_check_existence",
      config: {
        title: TOOL_CATALOG.panproto_check_existence.title,
        description: "Check if a migration between two schemas satisfies existence conditions",
        inputSchema: z.object({
          src: z.string().describe("Path to source schema"),
          tgt: z.string().describe("Path to target schema"),
          mapping: z.string().describe("Path to migration mapping file"),
          typecheck: z.boolean().optional().describe("Also type-check at the GAT level"),
        }),
        annotations: TOOL_CATALOG.panproto_check_existence.annotations,
      },
      handler: withErrorBoundary(async ({ src, tgt, mapping, typecheck }) => {
        const args = ["check", "--src", src as string, "--tgt", tgt as string, "--mapping", mapping as string];
        if (typecheck) args.push("--typecheck");
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lift",
      config: {
        title: TOOL_CATALOG.panproto_lift.title,
        description: "Apply a migration to a data record, transforming it from source to target schema. Supports restrict (pullback Δ), sigma (left Kan Σ), and pi (right Kan Π) directions.",
        inputSchema: z.object({
          migration: z.string().describe("Path to migration mapping file"),
          src_schema: z.string().describe("Path to source schema"),
          tgt_schema: z.string().describe("Path to target schema"),
          record: z.string().describe("Path to the data record"),
          direction: z.enum(["restrict", "sigma", "pi"]).optional().describe("Migration direction (default: restrict)"),
          instance_type: z.enum(["wtype", "functor"]).optional().describe("Instance type (default: wtype)"),
        }),
        annotations: TOOL_CATALOG.panproto_lift.annotations,
      },
      handler: withErrorBoundary(async ({ migration, src_schema, tgt_schema, record, direction, instance_type }) => {
        const args = [
          "lift", "--migration", migration as string,
          "--src-schema", src_schema as string, "--tgt-schema", tgt_schema as string,
        ];
        if (direction) args.push("--direction", direction as string);
        if (instance_type) args.push("--instance-type", instance_type as string);
        args.push(record as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_auto_migrate",
      config: {
        title: TOOL_CATALOG.panproto_auto_migrate.title,
        description: "Automatically discover a migration morphism between two schemas via CSP search. Runs the 14-strategy alignment ladder (user_hint, exact, exact_suffix, edge_label, alias, token_similarity, description_similarity, type_signature, wrap_unwrap, coerce, neighborhood, wl_refinement, structural, llm) and emits an alignmentStrategies summary keyed by these tags with anchorCount and meanConfidence.",
        inputSchema: z.object({
          old_schema: z.string().describe("Path to old/source schema"),
          new_schema: z.string().describe("Path to new/target schema"),
          json: z.boolean().optional().describe("Output as JSON"),
          monic: z.boolean().optional().describe("Require injective vertex mapping"),
        }),
        annotations: TOOL_CATALOG.panproto_auto_migrate.annotations,
      },
      handler: withErrorBoundary(async ({ old_schema, new_schema, json, monic }) => {
        const args = ["auto-migrate"];
        if (json) args.push("--json");
        if (monic) args.push("--monic");
        args.push(old_schema as string, new_schema as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_integrate",
      config: {
        title: TOOL_CATALOG.panproto_integrate.title,
        description: "Compute the pushout (integration) of two schemas, merging them into one via categorical colimit with universal-property verification",
        inputSchema: z.object({
          left: z.string().describe("Path to left schema"),
          right: z.string().describe("Path to right schema"),
          auto_overlap: z.boolean().optional().describe("Auto-discover overlap between schemas"),
          json: z.boolean().optional().describe("Output as JSON"),
        }),
        annotations: TOOL_CATALOG.panproto_integrate.annotations,
      },
      handler: withErrorBoundary(async ({ left, right, auto_overlap, json }) => {
        const args = ["integrate"];
        if (auto_overlap) args.push("--auto-overlap");
        if (json) args.push("--json");
        args.push(left as string, right as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
  ];
}
