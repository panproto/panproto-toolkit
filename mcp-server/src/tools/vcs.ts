import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function vcsReadTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_vcs_status",
      config: {
        title: TOOL_CATALOG.panproto_vcs_status.title,
        description: "Show panproto VCS status (staged, modified, untracked schema files)",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          short: z.boolean().optional().describe("Short format"),
          porcelain: z.boolean().optional().describe("Machine-readable format"),
          branch: z.boolean().optional().describe("Show branch info"),
          data: z.string().optional().describe("Path to data directory for staleness info"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_status.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path, short, porcelain, branch, data }) => {
        const args = ["status"];
        if (short) args.push("-s");
        if (porcelain) args.push("--porcelain");
        if (branch) args.push("-b");
        if (data) args.push("--data", data as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_log",
      config: {
        title: TOOL_CATALOG.panproto_vcs_log.title,
        description: "Show schema commit history. Each commit record carries protocolHash, theoryIds, dataHashes, complementHashes, editLogHashes, cstComplementHashes, migrationHash, and timestamp alongside the schema-tree root hash.",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          limit: z.number().optional().describe("Maximum number of commits to show"),
          oneline: z.boolean().optional().describe("Show each commit on a single line"),
          graph: z.boolean().optional().describe("Show ASCII branch graph"),
          all: z.boolean().optional().describe("Show all branches"),
          format: z.string().optional().describe("Pretty-print using format string"),
          author: z.string().optional().describe("Filter by author name"),
          grep: z.string().optional().describe("Filter by commit message pattern"),
          data: z.boolean().optional().describe("Show data versioning info"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_log.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path, limit, oneline, graph, all, format, author, grep, data }) => {
        const args = ["log"];
        if (limit) args.push("-n", String(limit));
        if (oneline) args.push("--oneline");
        if (graph) args.push("--graph");
        if (all) args.push("--all");
        if (format) args.push("--format", format as string);
        if (author) args.push("--author", author as string);
        if (grep) args.push("--grep", grep as string);
        if (data) args.push("--data");
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_diff",
      config: {
        title: TOOL_CATALOG.panproto_vcs_diff.title,
        description: "Diff two schema versions or show staged changes. The schema is resolved per-commit by walking the SchemaTreeObject Merkle tree; only files whose FileSchemaObject hash changed contribute to the diff.",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          old_ref: z.string().optional().describe("Old ref or schema path"),
          new_ref: z.string().optional().describe("New ref or schema path"),
          staged: z.boolean().optional().describe("Diff staged changes against HEAD"),
          stat: z.boolean().optional().describe("Show diffstat summary"),
          name_only: z.boolean().optional().describe("Show only changed file names"),
          name_status: z.boolean().optional().describe("Show changed file names with status (A/D/M)"),
          theory: z.boolean().optional().describe("Show theory-level diff"),
          lens: z.boolean().optional().describe("Show lens diff"),
          optic_kind: z.boolean().optional().describe("Show optic kind classification"),
          detect_renames: z.boolean().optional().describe("Detect renames"),
          save: z.string().optional().describe("Save generated protolens chain to file (requires --lens)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_diff.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path, old_ref, new_ref, staged, stat, name_only, name_status, theory, lens, optic_kind, detect_renames, save }) => {
        const args = ["diff"];
        if (staged) args.push("--staged");
        if (stat) args.push("--stat");
        if (name_only) args.push("--name-only");
        if (name_status) args.push("--name-status");
        if (theory) args.push("--theory");
        if (lens) args.push("--lens");
        if (save) args.push("--save", save as string);
        if (optic_kind) args.push("--optic-kind");
        if (detect_renames) args.push("--detect-renames");
        if (old_ref) args.push(old_ref as string);
        if (new_ref) args.push(new_ref as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_blame",
      config: {
        title: TOOL_CATALOG.panproto_vcs_blame.title,
        description: "Show which commit introduced a specific schema element",
        inputSchema: z.object({
          element_type: z.enum(["vertex", "edge", "constraint"]).describe("Element type"),
          element_id: z.string().describe('Element identifier'),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          reverse: z.boolean().optional().describe("Show which commit removed the element"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_blame.annotations,
      },
      handler: withErrorBoundary(async ({ element_type, element_id, repo_path, reverse }) => {
        const args = ["blame", "--element-type", element_type as string];
        if (reverse) args.push("--reverse");
        args.push(element_id as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_show",
      config: {
        title: TOOL_CATALOG.panproto_vcs_show.title,
        description: "Inspect a commit, schema, migration, or other content-addressed object by ref or hash",
        inputSchema: z.object({
          target: z.string().describe("Commit ref, hash, or object ID to show"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          format: z.string().optional().describe("Output format"),
          stat: z.boolean().optional().describe("Show diffstat"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_show.annotations,
      },
      handler: withErrorBoundary(async ({ target, repo_path, format, stat }) => {
        const args = ["show"];
        if (format) args.push("--format", format as string);
        if (stat) args.push("--stat");
        args.push(target as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_reflog",
      config: {
        title: TOOL_CATALOG.panproto_vcs_reflog.title,
        description: "Show ref mutation history (which operations moved HEAD or branch refs)",
        inputSchema: z.object({
          ref_name: z.string().optional().describe("Ref to show history for (default: HEAD)"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          limit: z.number().optional().describe("Maximum entries to show"),
          all: z.boolean().optional().describe("Show all refs"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_reflog.annotations,
      },
      handler: withErrorBoundary(async ({ ref_name, repo_path, limit, all }) => {
        const args = ["reflog"];
        if (all) args.push("--all");
        if (limit) args.push("-n", String(limit));
        if (ref_name) args.push(ref_name as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_bisect",
      config: {
        title: TOOL_CATALOG.panproto_vcs_bisect.title,
        description: "Binary search through commit history to find which commit introduced a breaking schema change",
        inputSchema: z.object({
          good: z.string().describe("Known good commit ref"),
          bad: z.string().describe("Known bad commit ref"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_bisect.annotations,
      },
      handler: withErrorBoundary(async ({ good, bad, repo_path }) => {
        const result = await execCli("bisect", good as string, bad as string, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_branch_list",
      config: {
        title: TOOL_CATALOG.panproto_vcs_branch_list.title,
        description: "List all branches in the panproto repository",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          verbose: z.boolean().optional().describe("Show last commit on each branch"),
          all: z.boolean().optional().describe("Show all branches including remote-tracking"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_branch_list.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path, verbose, all }) => {
        const args = ["branch"];
        if (verbose) args.push("-v");
        if (all) args.push("-a");
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_tag_list",
      config: {
        title: TOOL_CATALOG.panproto_vcs_tag_list.title,
        description: "List all tags in the panproto repository",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_tag_list.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path }) => {
        const result = await execCli("tag", "-l", { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_stash_list",
      config: {
        title: TOOL_CATALOG.panproto_vcs_stash_list.title,
        description: "List all stash entries",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_stash_list.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path }) => {
        const result = await execCli("stash", "list", { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
  ];
}
