import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerExprTools(server: McpServer): void {
  server.tool(
    "panproto_eval_expr",
    "Evaluate a panproto expression (pure functional lambda calculus with ~50 builtins)",
    {
      expr: z
        .string()
        .describe('Expression to evaluate (e.g., "2 + 3 * 4" or "\\\\x -> x + 1")'),
    },
    withErrorBoundary(async ({ expr }) => {
      const result = await execCli("expr", "eval", expr);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_parse_expr",
    "Parse an expression and print its AST (useful for debugging expression syntax)",
    {
      source: z.string().describe("Expression source to parse"),
    },
    withErrorBoundary(async ({ source }) => {
      const result = await execCli("expr", "parse", source);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_fmt_expr",
    "Parse an expression and pretty-print it in canonical form",
    {
      source: z.string().describe("Expression source to format"),
    },
    withErrorBoundary(async ({ source }) => {
      const result = await execCli("expr", "fmt", source);
      return textContent(result);
    })
  );
}
