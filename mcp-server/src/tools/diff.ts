import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerDiffTools(server: McpServer): void {
  server.tool(
    "panproto_diff",
    "Compute structural diff between two schemas",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
    },
    async ({ src, tgt }) => {
      const result = await execCli("diff", "--src", src, "--tgt", tgt);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_classify",
    "Classify a schema change as compatible, backward-compatible, or breaking",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
      protocol: z
        .string()
        .optional()
        .describe("Protocol name (for protocol-aware classification)"),
    },
    async ({ src, tgt, protocol }) => {
      const args = ["check", "--src", src, "--tgt", tgt];
      if (protocol) args.push("--protocol", protocol);
      const result = await execCli(...args);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
