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
        description: "Discover a migration between two schemas by searching for a span src <- apex -> tgt, whose apex is the sub-schema of the source the search could give an image. The search never refuses for want of a match: two schemas with nothing in common come back as an empty apex. Three flags form a strictness ladder over that one search: total accepts only a span covering every source vertex (falling back to the total-morphism search when the optimal span is partial), the default accepts any span covering at least one vertex, and span accepts an empty apex as the answer. monic is orthogonal to all three. The human report prints the apex size, the fraction of the source it covers, and the interval the search proved the quality lies in; a right leg that identifies two source vertices is reported on stderr, which this tool surfaces only when the command exits non-zero. The source schema's protocol is resolved on every path, so a schema naming a protocol the CLI does not carry is refused. The objective is structural: name, edge, prop and degree agreement. No alignment evidence reaches this search. The 14-strategy ladder seeds auto-lens generation rather than auto-migrate, and the anchor term's shipped weight is zero.",
        inputSchema: z.object({
          old_schema: z.string().describe("Path to old/source schema"),
          new_schema: z.string().describe("Path to new/target schema"),
          json: z.boolean().optional().describe("Emit the span's right leg, a migration out of the apex, as JSON. Its declared domain is the apex digest, not the source schema."),
          monic: z.boolean().optional().describe("Require injective vertex mapping"),
          total: z.boolean().optional().describe("Accept only a span covering every source vertex; fails when no total morphism exists (conflicts with span)"),
          span: z.boolean().optional().describe("Accept an empty apex as the answer that the two schemas share nothing (conflicts with total)"),
        }),
        annotations: TOOL_CATALOG.panproto_auto_migrate.annotations,
      },
      handler: withErrorBoundary(async ({ old_schema, new_schema, json, monic, total, span }) => {
        if (total && span) {
          return textContent("Error: total and span are mutually exclusive rungs of the same strictness ladder");
        }
        const args = ["auto-migrate"];
        if (json) args.push("--json");
        if (monic) args.push("--monic");
        if (total) args.push("--total");
        if (span) args.push("--span");
        args.push(old_schema as string, new_schema as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_integrate",
      config: {
        title: TOOL_CATALOG.panproto_integrate.title,
        description: "Compute the pushout (integration) of two schemas, merging them into one via categorical colimit with universal-property verification. The left schema's protocol is resolved on every path, not only under auto_overlap, so a schema naming a protocol the CLI does not carry exits non-zero naming it rather than integrating against an empty overlap. Under auto_overlap the overlap is the largest common induced sub-schema, found by one span search on the isomorphism path; without it the two schemas are merged as though they shared nothing.",
        inputSchema: z.object({
          left: z.string().describe("Path to left schema"),
          right: z.string().describe("Path to right schema"),
          auto_overlap: z.boolean().optional().describe("Discover the maximum common induced sub-schema and merge along it"),
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
