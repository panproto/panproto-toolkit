import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function vcsWriteTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_vcs_init",
      config: {
        title: TOOL_CATALOG.panproto_vcs_init.title,
        description: "Initialize a new panproto repository with a .panproto/ directory and object store",
        inputSchema: z.object({
          path: z.string().optional().describe("Directory to initialize (default: cwd)"),
          initial_branch: z.string().optional().describe("Name for the initial branch (default: main)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_init.annotations,
      },
      handler: withErrorBoundary(async ({ path, initial_branch }) => {
        const args = ["init"];
        if (initial_branch) args.push("-b", initial_branch as string);
        if (path) args.push(path as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_add",
      config: {
        title: TOOL_CATALOG.panproto_vcs_add.title,
        description: "Stage a schema for the next commit. Auto-migration derives the migration from the previous HEAD schema. The path may be a panproto JSON schema, a single source file parsed via tree-sitter, or a directory, which is staged as a per-file schema tree so an edit to one file leaves its siblings' object IDs untouched. Staging a data directory writes each JSON file to the index keyed by its source path, all or nothing across the directory. Staged data is stored as opaque bytes: it is not parsed or checked against the schema it is recorded under.",
        inputSchema: z.object({
          schema: z.string().describe("Path to the schema file, source file, or project directory to stage"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          dry_run: z.boolean().optional().describe("Preview staging without modifying index"),
          force: z.boolean().optional().describe("Force add even if validation fails"),
          data: z.string().optional().describe("Path to data directory to stage alongside the schema"),
          skip_verify: z.boolean().optional().describe("Record the derived migration but skip GAT migration validation, leaving the stage pending. Use when replaying already-validated schema versions, where the per-add model check dominates."),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_add.annotations,
      },
      handler: withErrorBoundary(async ({ schema, repo_path, dry_run, force, data, skip_verify }) => {
        const args = ["add"];
        if (dry_run) args.push("-n");
        if (force) args.push("-f");
        if (data) args.push("--data", data as string);
        if (skip_verify) args.push("--skip-verify");
        args.push(schema as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_commit",
      config: {
        title: TOOL_CATALOG.panproto_vcs_commit.title,
        description: "Create a new commit from staged schemas. The commit record stores protocolHash, theoryIds, dataHashes, complementHashes, editLogHashes, cstComplementHashes, migrationHash, and timestamp.",
        inputSchema: z.object({
          message: z.string().describe("Commit message"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          author: z.string().optional().describe("Author name (default: anonymous)"),
          amend: z.boolean().optional().describe("Amend the previous commit"),
          allow_empty: z.boolean().optional().describe("Allow commit with no changes"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_commit.annotations,
      },
      handler: withErrorBoundary(async ({ message, repo_path, author, amend, allow_empty }) => {
        const args = ["commit", "-m", message as string];
        if (author) args.push("--author", author as string);
        if (amend) args.push("--amend");
        if (allow_empty) args.push("--allow-empty");
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_checkout",
      config: {
        title: TOOL_CATALOG.panproto_vcs_checkout.title,
        description: "Switch to a different branch or commit. Optionally create a new branch. Use --migrate to auto-migrate data to the target schema.",
        inputSchema: z.object({
          target: z.string().describe("Branch name or commit ref to checkout"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          create: z.boolean().optional().describe("Create a new branch at the target"),
          detach: z.boolean().optional().describe("Detach HEAD at the target commit"),
          migrate: z.string().optional().describe("Path to data directory to auto-migrate"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_checkout.annotations,
      },
      handler: withErrorBoundary(async ({ target, repo_path, create, detach, migrate }) => {
        const args = ["checkout"];
        if (create) args.push("-b");
        if (detach) args.push("--detach");
        if (migrate) args.push("--migrate", migrate as string);
        args.push(target as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_branch_create",
      config: {
        title: TOOL_CATALOG.panproto_vcs_branch_create.title,
        description: "Create a new branch at the current HEAD",
        inputSchema: z.object({
          name: z.string().describe("Branch name"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          force: z.boolean().optional().describe("Force create (overwrite existing)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_branch_create.annotations,
      },
      handler: withErrorBoundary(async ({ name, repo_path, force }) => {
        const args = ["branch"];
        if (force) args.push("-f");
        args.push(name as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_branch_delete",
      config: {
        title: TOOL_CATALOG.panproto_vcs_branch_delete.title,
        description: "Delete a branch. Use force for unmerged branches.",
        inputSchema: z.object({
          name: z.string().describe("Branch name to delete"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          force: z.boolean().optional().describe("Force delete even if not merged"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_branch_delete.annotations,
      },
      handler: withErrorBoundary(async ({ name, repo_path, force }) => {
        const args = ["branch", force ? "-D" : "-d", name as string];
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_tag_create",
      config: {
        title: TOOL_CATALOG.panproto_vcs_tag_create.title,
        description: "Create a tag at the current HEAD",
        inputSchema: z.object({
          name: z.string().describe("Tag name"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          annotate: z.boolean().optional().describe("Create an annotated tag"),
          message: z.string().optional().describe("Tag message (for annotated tags)"),
          force: z.boolean().optional().describe("Force create (overwrite existing)"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_tag_create.annotations,
      },
      handler: withErrorBoundary(async ({ name, repo_path, annotate, message, force }) => {
        const args = ["tag"];
        if (annotate) args.push("-a");
        if (message) args.push("-m", message as string);
        if (force) args.push("-f");
        args.push(name as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_tag_delete",
      config: {
        title: TOOL_CATALOG.panproto_vcs_tag_delete.title,
        description: "Delete a tag",
        inputSchema: z.object({
          name: z.string().describe("Tag name to delete"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_tag_delete.annotations,
      },
      handler: withErrorBoundary(async ({ name, repo_path }) => {
        const result = await execCli("tag", "--delete", name as string, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_merge",
      config: {
        title: TOOL_CATALOG.panproto_vcs_merge.title,
        description: "Merge a branch into the current branch using pushout-based schema integration with universal-property verification. The merge discovers overlap automatically via pullback.",
        inputSchema: z.object({
          branch: z.string().optional().describe("Branch to merge (or --abort to cancel)"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          author: z.string().optional().describe("Author name"),
          message: z.string().optional().describe("Merge commit message"),
          no_commit: z.boolean().optional().describe("Merge without committing"),
          ff_only: z.boolean().optional().describe("Fast-forward only (fail if not possible)"),
          no_ff: z.boolean().optional().describe("Create a merge commit even for fast-forward"),
          squash: z.boolean().optional().describe("Squash all commits into one"),
          abort: z.boolean().optional().describe("Abort an in-progress merge"),
          migrate: z.string().optional().describe("Path to data directory to auto-migrate"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_merge.annotations,
      },
      handler: withErrorBoundary(async ({ branch, repo_path, author, message, no_commit, ff_only, no_ff, squash, abort, migrate }) => {
        const args = ["merge"];
        if (abort) args.push("--abort");
        if (author) args.push("--author", author as string);
        if (message) args.push("-m", message as string);
        if (no_commit) args.push("--no-commit");
        if (ff_only) args.push("--ff-only");
        if (no_ff) args.push("--no-ff");
        if (squash) args.push("--squash");
        if (migrate) args.push("--migrate", migrate as string);
        if (branch) args.push(branch as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_rebase",
      config: {
        title: TOOL_CATALOG.panproto_vcs_rebase.title,
        description: "Rebase the current branch onto another branch or commit. Rewrites commit history.",
        inputSchema: z.object({
          onto: z.string().optional().describe("Target to rebase onto"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          author: z.string().optional().describe("Author name"),
          abort: z.boolean().optional().describe("Abort an in-progress rebase"),
          cont: z.boolean().optional().describe("Continue after resolving conflicts"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_rebase.annotations,
      },
      handler: withErrorBoundary(async ({ onto, repo_path, author, abort, cont }) => {
        const args = ["rebase"];
        if (abort) args.push("--abort");
        if (cont) args.push("--continue");
        if (author) args.push("--author", author as string);
        if (onto) args.push(onto as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_cherry_pick",
      config: {
        title: TOOL_CATALOG.panproto_vcs_cherry_pick.title,
        description: "Apply a single commit from another branch to the current branch",
        inputSchema: z.object({
          commit: z.string().optional().describe("Commit ref to cherry-pick"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          author: z.string().optional().describe("Author name"),
          no_commit: z.boolean().optional().describe("Apply without committing"),
          record_origin: z.boolean().optional().describe("Record the source commit ref"),
          abort: z.boolean().optional().describe("Abort an in-progress cherry-pick"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_cherry_pick.annotations,
      },
      handler: withErrorBoundary(async ({ commit, repo_path, author, no_commit, record_origin, abort }) => {
        const args = ["cherry-pick"];
        if (abort) args.push("--abort");
        if (author) args.push("--author", author as string);
        if (no_commit) args.push("-n");
        if (record_origin) args.push("-x");
        if (commit) args.push(commit as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_reset",
      config: {
        title: TOOL_CATALOG.panproto_vcs_reset.title,
        description: "Move HEAD to a target commit. --soft keeps staged changes, --hard discards everything.",
        inputSchema: z.object({
          target: z.string().describe("Commit ref to reset to"),
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          soft: z.boolean().optional().describe("Keep staged changes"),
          hard: z.boolean().optional().describe("Discard all changes"),
          author: z.string().optional().describe("Author name"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_reset.annotations,
      },
      handler: withErrorBoundary(async ({ target, repo_path, soft, hard, author }) => {
        const args = ["reset"];
        if (soft) args.push("--soft");
        if (hard) args.push("--hard");
        if (author) args.push("--author", author as string);
        args.push(target as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_stash_push",
      config: {
        title: TOOL_CATALOG.panproto_vcs_stash_push.title,
        description: "Save the current working state to a stash entry",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          message: z.string().optional().describe("Stash message"),
          author: z.string().optional().describe("Author name"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_stash_push.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path, message, author }) => {
        const args = ["stash", "push"];
        if (message) args.push("-m", message as string);
        if (author) args.push("--author", author as string);
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_stash_pop",
      config: {
        title: TOOL_CATALOG.panproto_vcs_stash_pop.title,
        description: "Apply and remove the most recent stash entry",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_stash_pop.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path }) => {
        const result = await execCli("stash", "pop", { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
    {
      name: "panproto_vcs_gc",
      config: {
        title: TOOL_CATALOG.panproto_vcs_gc.title,
        description: "Garbage collect unreachable objects from the repository object store",
        inputSchema: z.object({
          repo_path: z.string().optional().describe("Path to panproto repository (default: cwd)"),
          dry_run: z.boolean().optional().describe("Preview without deleting"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_vcs_gc.annotations,
      },
      handler: withErrorBoundary(async ({ repo_path, dry_run }) => {
        const args = ["gc"];
        if (dry_run) args.push("--dry-run");
        const result = await execCli(...args, { cwd: repo_path as string | undefined });
        return textContent(result);
      }),
    },
  ];
}
