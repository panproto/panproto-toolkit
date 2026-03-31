import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerConvertTools(server: McpServer): void {
  server.tool(
    "panproto_convert",
    "Convert data between schemas using protolens chains",
    {
      data: z.string().describe("Path to data file or directory"),
      protocol: z.string().describe("Protocol name"),
      from: z.string().optional().describe("Path to source schema"),
      to: z.string().optional().describe("Path to target schema"),
      chain: z.string().optional().describe("Pre-built protolens chain (alternative to from/to)"),
      output: z.string().optional().describe("Output file or directory"),
      direction: z.enum(["forward", "backward"]).optional().describe("Direction (default: forward)"),
    },
    withErrorBoundary(async ({ data, protocol, from, to, chain, output, direction }) => {
      const args = ["data", "convert", "--protocol", protocol];
      if (from) args.push("--from", from);
      if (to) args.push("--to", to);
      if (chain) args.push("--chain", chain);
      if (output) args.push("-o", output);
      if (direction) args.push("--direction", direction);
      args.push(data);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_batch_migrate",
    "Migrate a directory of data files to match the current schema version via VCS history",
    {
      data_dir: z.string().describe("Directory containing data files"),
      protocol: z.string().optional().describe("Protocol name (inferred from VCS if omitted)"),
      dry_run: z.boolean().optional().describe("Preview without modifying files"),
      backward: z.boolean().optional().describe("Migrate backward using stored complements"),
      output: z.string().optional().describe("Output directory (default: overwrite in place)"),
    },
    withErrorBoundary(async ({ data_dir, protocol, dry_run, backward, output }) => {
      const args = ["data", "migrate"];
      if (protocol) args.push("--protocol", protocol);
      if (dry_run) args.push("--dry-run");
      if (backward) args.push("--backward");
      if (output) args.push("-o", output);
      args.push(data_dir);
      const result = await execCli(...args, { timeout: 120_000 });
      return textContent(result);
    })
  );

  server.tool(
    "panproto_data_status",
    "Report data staleness relative to the current schema version",
    {
      data_dir: z.string().describe("Directory containing data files"),
    },
    withErrorBoundary(async ({ data_dir }) => {
      const result = await execCli("data", "status", data_dir);
      return textContent(result);
    })
  );
}
