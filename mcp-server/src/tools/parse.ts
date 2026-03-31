import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerParseTools(server: McpServer): void {
  server.tool(
    "panproto_parse_file",
    "Parse a source file into a panproto schema representation (248 languages supported via tree-sitter)",
    {
      file_path: z.string().describe("Path to the source file"),
    },
    withErrorBoundary(async ({ file_path }) => {
      const result = await execCli("parse", "file", file_path);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_parse_project",
    "Parse all files in a directory into a unified project schema with cross-file imports",
    {
      path: z.string().optional().describe("Directory to parse (default: current directory)"),
    },
    withErrorBoundary(async ({ path }) => {
      const args = ["parse", "project"];
      if (path) args.push(path);
      const result = await execCli(...args, { timeout: 120_000 });
      return textContent(result);
    })
  );

  server.tool(
    "panproto_parse_emit",
    "Round-trip parse and emit a source file (parse then reconstruct to verify fidelity)",
    {
      file_path: z.string().describe("Path to the source file"),
    },
    withErrorBoundary(async ({ file_path }) => {
      const result = await execCli("parse", "emit", file_path);
      return textContent(result);
    })
  );
}
