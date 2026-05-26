import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function convertTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_convert",
      config: {
        title: TOOL_CATALOG.panproto_convert.title,
        description: "Convert data between schemas using protolens chains. Supports forward and backward direction, with optional default values for fields added by the target schema.",
        inputSchema: z.object({
          data: z.string().describe("Path to data file or directory"),
          protocol: z.string().describe("Protocol name"),
          from: z.string().optional().describe("Path to source schema"),
          to: z.string().optional().describe("Path to target schema"),
          chain: z.string().optional().describe("Pre-built protolens chain (alternative to from/to)"),
          output: z.string().optional().describe("Output file or directory"),
          direction: z.enum(["forward", "backward"]).optional().describe("Direction (default: forward)"),
          defaults: z.string().optional().describe("Comma-delimited key=value pairs for default field values"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_convert.annotations,
      },
      handler: withErrorBoundary(async ({ data, protocol, from, to, chain, output, direction, defaults }) => {
        const args = ["data", "convert", "--protocol", protocol as string];
        if (from) args.push("--from", from as string);
        if (to) args.push("--to", to as string);
        if (chain) args.push("--chain", chain as string);
        if (output) args.push("-o", output as string);
        if (direction) args.push("--direction", direction as string);
        if (defaults) args.push("--defaults", defaults as string);
        args.push(data as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_batch_migrate",
      config: {
        title: TOOL_CATALOG.panproto_batch_migrate.title,
        description: "Migrate a directory of data files to match the current schema version via VCS history. Uses --dry-run to preview before modifying files. Supports backward migration using stored complements.",
        inputSchema: z.object({
          data_dir: z.string().describe("Directory containing data files"),
          protocol: z.string().optional().describe("Protocol name (inferred from VCS if omitted)"),
          dry_run: z.boolean().optional().describe("Preview without modifying files"),
          backward: z.boolean().optional().describe("Migrate backward using stored complements"),
          output: z.string().optional().describe("Output directory (default: overwrite in place)"),
          coverage: z.boolean().optional().describe("Report coverage statistics"),
          range: z.string().optional().describe("Migrate between specific commits (default: parent..HEAD)"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_batch_migrate.annotations,
      },
      handler: withErrorBoundary(async ({ data_dir, protocol, dry_run, backward, output, coverage, range }) => {
        const args = ["data", "migrate"];
        if (protocol) args.push("--protocol", protocol as string);
        if (range) args.push("--range", range as string);
        if (dry_run) args.push("--dry-run");
        if (backward) args.push("--backward");
        if (coverage) args.push("--coverage");
        if (output) args.push("-o", output as string);
        args.push(data_dir as string);
        const result = await execCli(...args, { timeout: 120_000 });
        return textContent(result);
      }),
    },
    {
      name: "panproto_data_status",
      config: {
        title: TOOL_CATALOG.panproto_data_status.title,
        description: "Report data staleness relative to the current schema version",
        inputSchema: z.object({
          data_dir: z.string().describe("Directory containing data files"),
        }),
        annotations: TOOL_CATALOG.panproto_data_status.annotations,
      },
      handler: withErrorBoundary(async ({ data_dir }) => {
        const result = await execCli("data", "status", data_dir as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_data_sync",
      config: {
        title: TOOL_CATALOG.panproto_data_sync.title,
        description: "Sync data files to the target schema version via VCS history, optionally recording an edit log for provenance tracking",
        inputSchema: z.object({
          data_dir: z.string().describe("Directory containing data files"),
          edits: z.boolean().optional().describe("Store an edit log recording fine-grained modifications"),
          target: z.string().optional().describe("Target ref (default: HEAD)"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_data_sync.annotations,
      },
      handler: withErrorBoundary(async ({ data_dir, edits, target }) => {
        const args = ["data", "sync"];
        if (edits) args.push("--edits");
        if (target) args.push("--target", target as string);
        args.push(data_dir as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
  ];
}
