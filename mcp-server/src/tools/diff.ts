import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerDiffTools(server: McpServer): void {
  server.tool(
    "panproto_diff",
    "Compute structural diff between two schemas, showing added/removed/modified elements",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
      stat: z.boolean().optional().describe("Show diffstat summary"),
      detect_renames: z.boolean().optional().describe("Detect likely renames"),
      theory: z.boolean().optional().describe("Show theory-level diff (sorts, operations)"),
    },
    withErrorBoundary(async ({ src, tgt, stat, detect_renames, theory }) => {
      const args = ["diff", src, tgt];
      if (stat) args.push("--stat");
      if (detect_renames) args.push("--detect-renames");
      if (theory) args.push("--theory");
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_classify",
    "Classify a schema change as compatible, backward-compatible, or breaking",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
      mapping: z.string().describe("Path to migration mapping file"),
    },
    withErrorBoundary(async ({ src, tgt, mapping }) => {
      const result = await execCli("check", "--src", src, "--tgt", tgt, "--mapping", mapping);
      return textContent(result);
    })
  );
}
