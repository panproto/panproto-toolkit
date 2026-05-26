import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function diffTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_diff",
      config: {
        title: TOOL_CATALOG.panproto_diff.title,
        description: "Compute structural diff between two schemas, showing added/removed/modified elements",
        inputSchema: z.object({
          src: z.string().describe("Path to source schema"),
          tgt: z.string().describe("Path to target schema"),
          stat: z.boolean().optional().describe("Show diffstat summary"),
          detect_renames: z.boolean().optional().describe("Detect likely renames"),
          theory: z.boolean().optional().describe("Show theory-level diff (sorts, operations)"),
          optic_kind: z.boolean().optional().describe("Show optic kind classification for each change"),
        }),
        annotations: TOOL_CATALOG.panproto_diff.annotations,
      },
      handler: withErrorBoundary(async ({ src, tgt, stat, detect_renames, theory, optic_kind }) => {
        const args = ["diff", src as string, tgt as string];
        if (stat) args.push("--stat");
        if (detect_renames) args.push("--detect-renames");
        if (theory) args.push("--theory");
        if (optic_kind) args.push("--optic-kind");
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_classify",
      config: {
        title: TOOL_CATALOG.panproto_classify.title,
        description: "Classify a schema change as compatible, backward-compatible, or breaking",
        inputSchema: z.object({
          src: z.string().describe("Path to source schema"),
          tgt: z.string().describe("Path to target schema"),
          mapping: z.string().describe("Path to migration mapping file"),
        }),
        annotations: TOOL_CATALOG.panproto_classify.annotations,
      },
      handler: withErrorBoundary(async ({ src, tgt, mapping }) => {
        const result = await execCli("check", "--src", src as string, "--tgt", tgt as string, "--mapping", mapping as string);
        return textContent(result);
      }),
    },
  ];
}
