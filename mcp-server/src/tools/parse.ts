import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function parseTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_parse_file",
      config: {
        title: TOOL_CATALOG.panproto_parse_file.title,
        description: "Parse a source file into a panproto schema representation (261 languages supported via tree-sitter). Each grammar auto-derives a GAT theory from node-types.json. The generic AstWalker handles all languages with interstitial text capture for exact round-trip emission. As of v0.48.0, the parse/emit pair is a first-class asymmetric lens with the LayoutEnricher cross-crate registration mechanism.",
        inputSchema: z.object({
          file_path: z.string().describe("Path to the source file"),
        }),
        annotations: TOOL_CATALOG.panproto_parse_file.annotations,
      },
      handler: withErrorBoundary(async ({ file_path }) => {
        const result = await execCli("parse", "file", file_path as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_parse_project",
      config: {
        title: TOOL_CATALOG.panproto_parse_project.title,
        description: "Parse all files in a directory into a unified project schema with cross-file import resolution via schema coproduct. Uses the panproto.toml manifest if present.",
        inputSchema: z.object({
          path: z.string().optional().describe("Directory to parse (default: current directory)"),
        }),
        annotations: TOOL_CATALOG.panproto_parse_project.annotations,
      },
      handler: withErrorBoundary(async ({ path }) => {
        const args = ["parse", "project"];
        if (path) args.push(path as string);
        const result = await execCli(...args, { timeout: 120_000 });
        return textContent(result);
      }),
    },
    {
      name: "panproto_parse_emit",
      config: {
        title: TOOL_CATALOG.panproto_parse_emit.title,
        description: "Round-trip parse and emit a source file (parse then reconstruct to verify fidelity). Uses emit_pretty with the grammar-driven layout policy for canonical formatting. The v0.48.0+ parse/decorate/emit lens guarantees structural equivalence modulo vertex-id renaming.",
        inputSchema: z.object({
          file_path: z.string().describe("Path to the source file"),
        }),
        annotations: TOOL_CATALOG.panproto_parse_emit.annotations,
      },
      handler: withErrorBoundary(async ({ file_path }) => {
        const result = await execCli("parse", "emit", file_path as string);
        return textContent(result);
      }),
    },
  ];
}
