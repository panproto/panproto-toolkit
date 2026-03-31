import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerVcsTools(server: McpServer): void {
  server.tool(
    "panproto_vcs_status",
    "Show panproto VCS status (staged, modified, untracked schema files)",
    {
      repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
    },
    withErrorBoundary(async ({ repo_path }) => {
      const result = await execCli("status", { cwd: repo_path });
      return textContent(result);
    })
  );

  server.tool(
    "panproto_vcs_log",
    "Show schema commit history with optional filtering",
    {
      repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
      limit: z.number().optional().describe("Maximum number of commits to show"),
      oneline: z.boolean().optional().describe("Show each commit on a single line"),
      graph: z.boolean().optional().describe("Show ASCII branch graph"),
    },
    withErrorBoundary(async ({ repo_path, limit, oneline, graph }) => {
      const args = ["log"];
      if (limit) args.push("-n", String(limit));
      if (oneline) args.push("--oneline");
      if (graph) args.push("--graph");
      const result = await execCli(...args, { cwd: repo_path });
      return textContent(result);
    })
  );

  server.tool(
    "panproto_vcs_diff",
    "Diff two schema versions or show staged changes in the VCS",
    {
      repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
      old_ref: z.string().optional().describe("Old ref or schema path"),
      new_ref: z.string().optional().describe("New ref or schema path"),
      staged: z.boolean().optional().describe("Diff staged changes against HEAD"),
      stat: z.boolean().optional().describe("Show diffstat summary"),
    },
    withErrorBoundary(async ({ repo_path, old_ref, new_ref, staged, stat }) => {
      const args = ["diff"];
      if (staged) args.push("--staged");
      if (stat) args.push("--stat");
      if (old_ref) args.push(old_ref);
      if (new_ref) args.push(new_ref);
      const result = await execCli(...args, { cwd: repo_path });
      return textContent(result);
    })
  );

  server.tool(
    "panproto_vcs_blame",
    "Show which commit introduced a specific schema element",
    {
      element_type: z.enum(["vertex", "edge", "constraint"]).describe("Element type"),
      element_id: z.string().describe('Element identifier (vertex ID, edge "src->tgt", or "vertex:sort")'),
      repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
    },
    withErrorBoundary(async ({ element_type, element_id, repo_path }) => {
      const result = await execCli(
        "blame", "--element-type", element_type, element_id,
        { cwd: repo_path }
      );
      return textContent(result);
    })
  );
}
