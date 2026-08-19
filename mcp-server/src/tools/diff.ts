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
        description: "Compute structural diff between two schemas, showing added/removed/modified elements. Each operand may be a panproto schema document, a schema-language document, a manifest-backed project directory (parsed as one bundle, so cross-document references resolve), or a source tree parsed via tree-sitter.",
        inputSchema: z.object({
          src: z.string().describe("Path to source schema, project directory, or source tree"),
          tgt: z.string().describe("Path to target schema, project directory, or source tree"),
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
        description: "Classify a schema change against a protocol as fully compatible, backward compatible, or breaking, printing the changes grouped by tier. Each operand may be a schema document or a manifest-backed project directory, so two versions of a lexicon project can be compared directly. Unlike panproto_diff, a protocol is required here, so a directory must be manifest-backed or hold documents in that protocol; a bare source tree is not an operand. Exit code 0 means no breaking change and 1 means at least one; both return the report. A protocol that disagrees with a directory's own manifest is a load error rather than a silent override.",
        inputSchema: z.object({
          old: z.string().describe("Path to the old schema, project directory, or source tree"),
          new: z.string().describe("Path to the new schema, project directory, or source tree"),
          protocol: z.string().describe("Protocol name to classify against (e.g., atproto)"),
          format: z.enum(["text", "json"]).optional().describe("Report format (default: text)"),
        }),
        annotations: TOOL_CATALOG.panproto_classify.annotations,
      },
      handler: withErrorBoundary(async ({ old, new: next, protocol, format }) => {
        const args = ["compat", old as string, next as string, "--protocol", protocol as string];
        if (format) args.push("--format", format as string);
        // Exit 1 is "breaking changes found", which is the answer rather than a
        // failure; exit 2 stays a usage or load error and surfaces as one.
        const result = await execCli(...args, { okExitCodes: [1] });
        return textContent(result);
      }),
    },
  ];
}
