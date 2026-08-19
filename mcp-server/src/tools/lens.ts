import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function lensTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_lens_generate",
      config: {
        title: TOOL_CATALOG.panproto_lens_generate.title,
        description: "Auto-generate a bidirectional protolens chain between two schemas. Supports stringency tiers (strict/balanced/lenient/exploratory) controlling which of the 14 alignment strategies and sort coercions the search may use; the tiers form a superset ladder except for wl_refinement and neighborhood, which can withdraw a pairing a lower tier made. Setting top_n above 1, or explain, reads the candidate list off the span search, so a lenient or exploratory tier answers on pairs where the source carries a sort the target lacks rather than reporting no morphism. Optic kinds (Iso, Lens, Prism, Affine, Traversal) are classified from the underlying TheoryTransform.",
        inputSchema: z.object({
          old_schema: z.string().describe("Path to old/source schema"),
          new_schema: z.string().describe("Path to new/target schema"),
          protocol: z.string().describe("Protocol name"),
          json: z.boolean().optional().describe("Output as JSON"),
          save: z.string().optional().describe("Save protolens chain to this file path"),
          hints: z.string().optional().describe("Path to a HintSpec JSON file for guided auto-lens generation"),
          stringency: z.enum(["strict", "balanced", "lenient", "exploratory"]).optional().describe("Stringency tier (default: balanced)"),
          top_n: z.number().int().positive().optional().describe("Return the top N ranked candidates"),
          explain: z.boolean().optional().describe("Include per-candidate explanations and strategy provenance"),
          chain: z.boolean().optional().describe("Output as protolens chain format"),
          try_overlap: z.boolean().optional().describe("Try overlap-based alignment when direct morphism fails"),
          fuse: z.boolean().optional().describe("Fuse multi-step chain into single endofunctor"),
          requirements: z.boolean().optional().describe("Show complement requirements"),
          defaults: z.string().optional().describe("Comma-delimited key=value default values for added fields"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_generate.annotations,
      },
      handler: withErrorBoundary(async ({ old_schema, new_schema, protocol, json, save, hints, stringency, top_n, explain, chain, try_overlap, fuse, requirements, defaults }) => {
        const args = ["lens", "generate", "--protocol", protocol as string];
        if (json) args.push("--json");
        if (chain) args.push("--chain");
        if (save) args.push("--save", save as string);
        if (hints) args.push("--hints", hints as string);
        if (stringency) args.push("--stringency", stringency as string);
        if (top_n !== undefined) args.push("--top-n", String(top_n));
        if (explain) args.push("--explain");
        if (try_overlap) args.push("--try-overlap");
        if (fuse) args.push("--fuse");
        if (requirements) args.push("--requirements");
        if (defaults) args.push("--defaults", defaults as string);
        args.push(old_schema as string, new_schema as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lens_apply",
      config: {
        title: TOOL_CATALOG.panproto_lens_apply.title,
        description: "Apply a protolens chain to data (forward or backward direction). Backward apply requires complement data from a previous forward apply.",
        inputSchema: z.object({
          chain: z.string().describe("Path to protolens chain JSON file"),
          data: z.string().describe("Path to data record"),
          protocol: z.string().describe("Protocol name"),
          direction: z.enum(["forward", "backward"]).optional().describe("Direction (default: forward)"),
          complement: z.string().optional().describe("Path to complement data (for backward apply)"),
          schema: z.string().optional().describe("Schema for chain instantiation"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_apply.annotations,
      },
      handler: withErrorBoundary(async ({ chain, data, protocol, direction, complement, schema }) => {
        const args = ["lens", "apply", "--protocol", protocol as string];
        if (direction) args.push("--direction", direction as string);
        if (complement) args.push("--complement", complement as string);
        if (schema) args.push("--schema", schema as string);
        args.push(chain as string, data as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lens_verify",
      config: {
        title: TOOL_CATALOG.panproto_lens_verify.title,
        description: "Generate a lens between one or two schemas and report its step count and alignment quality. Both positional arguments are read as schema JSON. As of panproto 0.71.0 this command does not reach the concrete law checks: the CLI passes no data path to the verifier, so it prints \"No test data provided; skipping concrete law checks.\" and stops. To check the round-trip laws on real data, call check_laws through the Python or WASM binding, where GetPut is strict and PutGet is checked modulo derived coordinates. PutPut is never checked.",
        inputSchema: z.object({
          data: z.string().describe("Path to the source schema file"),
          protocol: z.string().describe("Protocol name"),
          schema: z.string().optional().describe("Path to schema file"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_verify.annotations,
      },
      handler: withErrorBoundary(async ({ data, protocol, schema }) => {
        const args = ["lens", "verify", "--protocol", protocol as string];
        args.push(data as string);
        if (schema) args.push(schema as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lens_compose",
      config: {
        title: TOOL_CATALOG.panproto_lens_compose.title,
        description: "Compose two protolens chains via vertical composition. Requires structural equality of the intermediate endofunctor.",
        inputSchema: z.object({
          chain1: z.string().describe("Path to first chain or schema"),
          chain2: z.string().describe("Path to second chain or schema"),
          protocol: z.string().describe("Protocol name"),
          json: z.boolean().optional().describe("Output as JSON"),
          chain: z.boolean().optional().describe("Output as protolens chain format"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_compose.annotations,
      },
      handler: withErrorBoundary(async ({ chain1, chain2, protocol, json, chain }) => {
        const args = ["lens", "compose", "--protocol", protocol as string];
        if (json) args.push("--json");
        if (chain) args.push("--chain");
        args.push(chain1 as string, chain2 as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lens_inspect",
      config: {
        title: TOOL_CATALOG.panproto_lens_inspect.title,
        description: "Inspect a protolens chain showing each step, preconditions, effects, and optic kind classification",
        inputSchema: z.object({
          chain: z.string().describe("Path to protolens chain JSON"),
          protocol: z.string().describe("Protocol name"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_inspect.annotations,
      },
      handler: withErrorBoundary(async ({ chain, protocol }) => {
        const result = await execCli("lens", "inspect", "--protocol", protocol as string, chain as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lens_check",
      config: {
        title: TOOL_CATALOG.panproto_lens_check.title,
        description: "Check whether a protolens chain is applicable against a set of schemas by threading the running schema through each step and re-checking preconditions",
        inputSchema: z.object({
          chain: z.string().describe("Path to protolens chain JSON"),
          schemas_dir: z.string().describe("Path to directory of schema files"),
          protocol: z.string().describe("Protocol name"),
          dry_run: z.boolean().optional().describe("Preview without applying"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_check.annotations,
      },
      handler: withErrorBoundary(async ({ chain, schemas_dir, protocol, dry_run }) => {
        const args = ["lens", "check", "--protocol", protocol as string];
        if (dry_run) args.push("--dry-run");
        args.push(chain as string, schemas_dir as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_lens_lift",
      config: {
        title: TOOL_CATALOG.panproto_lens_lift.title,
        description: "Lift a protolens chain along a theory morphism, transporting it to a different protocol",
        inputSchema: z.object({
          chain: z.string().describe("Path to protolens chain JSON"),
          morphism: z.string().describe("Path to theory morphism document"),
          json: z.boolean().optional().describe("Output as JSON"),
        }),
        annotations: TOOL_CATALOG.panproto_lens_lift.annotations,
      },
      handler: withErrorBoundary(async ({ chain, morphism, json }) => {
        const args = ["lens", "lift"];
        if (json) args.push("--json");
        args.push(chain as string, morphism as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
  ];
}
