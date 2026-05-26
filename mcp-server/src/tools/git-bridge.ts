import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function gitBridgeTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_git_import",
      config: {
        title: TOOL_CATALOG.panproto_git_import.title,
        description: "Import git repository history into the panproto VCS store. Walks the git DAG topologically, parses files via panproto-project, and assembles project schemas into panproto-vcs commits. The import preserves DAG structure.",
        inputSchema: z.object({
          repo: z.string().describe("Path to the git repository"),
          revspec: z.string().optional().describe("Git revspec to import (default: HEAD)"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_git_import.annotations,
      },
      handler: withErrorBoundary(async ({ repo, revspec }) => {
        const args = ["git", "import", repo as string];
        if (revspec) args.push(revspec as string);
        const result = await execCli(...args, { timeout: 120_000 });
        return textContent(result);
      }),
    },
    {
      name: "panproto_git_export",
      config: {
        title: TOOL_CATALOG.panproto_git_export.title,
        description: "Export panproto VCS history to a new git repository. Loads project schemas and emits source files via panproto-parse, building git tree and commit objects.",
        inputSchema: z.object({
          dest: z.string().describe("Destination path for the new git repository"),
          repo: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_git_export.annotations,
      },
      handler: withErrorBoundary(async ({ dest, repo }) => {
        const args = ["git", "export"];
        if (repo) args.push("--repo", repo as string);
        args.push(dest as string);
        const result = await execCli(...args, { timeout: 120_000 });
        return textContent(result);
      }),
    },
  ];
}
