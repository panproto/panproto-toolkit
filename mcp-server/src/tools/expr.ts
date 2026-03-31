import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerExprTools(server: McpServer): void {
  server.tool(
    "panproto_eval_expr",
    "Evaluate a panproto expression (pure functional lambda calculus with ~50 builtins)",
    {
      expr: z
        .string()
        .describe('Expression to evaluate (e.g., "2 + 3 * 4" or "\\\\x -> x + 1")'),
    },
    async ({ expr }) => {
      const result = await execCli("expr", "eval", expr);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
