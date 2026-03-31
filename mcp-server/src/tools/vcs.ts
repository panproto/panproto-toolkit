import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerVcsTools(server: McpServer): void {
  server.tool(
    "panproto_vcs_status",
    "Show the current panproto VCS status (staged, modified, untracked schema files)",
    {
      repo_path: z
        .string()
        .optional()
        .describe("Path to the panproto repository (default: current directory)"),
    },
    async ({ repo_path }) => {
      const args = ["status"];
      const result = await execCli(...args, { cwd: repo_path });
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_vcs_log",
    "Show schema commit history",
    {
      repo_path: z
        .string()
        .optional()
        .describe("Path to the panproto repository (default: current directory)"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of commits to show"),
    },
    async ({ repo_path, limit }) => {
      const args = ["log"];
      if (limit) args.push("-n", String(limit));
      const result = await execCli(...args, { cwd: repo_path });
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
