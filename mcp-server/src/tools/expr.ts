import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function exprTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_eval_expr",
      config: {
        title: TOOL_CATALOG.panproto_eval_expr.title,
        description: "Evaluate a panproto expression (pure functional lambda calculus with 60 builtins covering arithmetic, rounding, string, list, record, comparison, boolean, type coercion, type inspection, utility, and graph traversal operations)",
        inputSchema: z.object({
          expr: z.string().describe('Expression to evaluate (e.g., "2 + 3 * 4" or "\\\\x -> x + 1")'),
        }),
        annotations: TOOL_CATALOG.panproto_eval_expr.annotations,
      },
      handler: withErrorBoundary(async ({ expr }) => {
        const result = await execCli("expr", "eval", expr as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_parse_expr",
      config: {
        title: TOOL_CATALOG.panproto_parse_expr.title,
        description: "Parse an expression and print its AST (useful for debugging expression syntax)",
        inputSchema: z.object({
          source: z.string().describe("Expression source to parse"),
        }),
        annotations: TOOL_CATALOG.panproto_parse_expr.annotations,
      },
      handler: withErrorBoundary(async ({ source }) => {
        const result = await execCli("expr", "parse", source as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_fmt_expr",
      config: {
        title: TOOL_CATALOG.panproto_fmt_expr.title,
        description: "Parse an expression and pretty-print it in canonical form",
        inputSchema: z.object({
          source: z.string().describe("Expression source to format"),
        }),
        annotations: TOOL_CATALOG.panproto_fmt_expr.annotations,
      },
      handler: withErrorBoundary(async ({ source }) => {
        const result = await execCli("expr", "fmt", source as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_check_expr",
      config: {
        title: TOOL_CATALOG.panproto_check_expr.title,
        description: "Parse an expression and report syntax errors without evaluation",
        inputSchema: z.object({
          source: z.string().describe("Expression source to check"),
        }),
        annotations: TOOL_CATALOG.panproto_check_expr.annotations,
      },
      handler: withErrorBoundary(async ({ source }) => {
        const result = await execCli("expr", "check", source as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_gat_eval",
      config: {
        title: TOOL_CATALOG.panproto_gat_eval.title,
        description: "Evaluate a GAT term from a JSON file, optionally with an environment providing variable bindings",
        inputSchema: z.object({
          file: z.string().describe("Path to the GAT term JSON file"),
          env: z.string().optional().describe("Path to environment JSON file with variable bindings"),
        }),
        annotations: TOOL_CATALOG.panproto_gat_eval.annotations,
      },
      handler: withErrorBoundary(async ({ file, env }) => {
        const args = ["expr", "gat-eval", file as string];
        if (env) args.push("--env", env as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_gat_check",
      config: {
        title: TOOL_CATALOG.panproto_gat_check.title,
        description: "Type-check a GAT term from a JSON file against its theory, including dependent sort resolution",
        inputSchema: z.object({
          file: z.string().describe("Path to the GAT term JSON file"),
        }),
        annotations: TOOL_CATALOG.panproto_gat_check.annotations,
      },
      handler: withErrorBoundary(async ({ file }) => {
        const result = await execCli("expr", "gat-check", file as string);
        return textContent(result);
      }),
    },
  ];
}
