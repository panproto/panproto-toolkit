import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerParseTools(server: McpServer): void {
  server.tool(
    "panproto_parse_file",
    "Parse a source file into a panproto schema representation (248 languages supported)",
    {
      file_path: z.string().describe("Path to the source file"),
      language: z
        .string()
        .optional()
        .describe("Language override (auto-detected from extension if omitted)"),
    },
    async ({ file_path, language }) => {
      const args = ["parse", "file"];
      if (language) args.push("--language", language);
      args.push(file_path);
      const result = await execCli(...args);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_parse_emit",
    "Round-trip parse and emit a source file (parse then reconstruct)",
    {
      file_path: z.string().describe("Path to the source file"),
    },
    async ({ file_path }) => {
      const result = await execCli("parse", "emit", file_path);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
