import type { ToolMetadata } from "./types.js";

const read = (title: string, idempotent = true): ToolMetadata => ({
  title,
  risk: "read",
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: idempotent, openWorldHint: false },
  requiresApproval: false,
});

const writeAdditive = (title: string, idempotent = false): ToolMetadata => ({
  title,
  risk: "write-additive",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: idempotent, openWorldHint: false },
  requiresApproval: false,
});

const writeDestructive = (title: string, message: string): ToolMetadata => ({
  title,
  risk: "write-destructive",
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  requiresApproval: true,
  confirmationMessage: message,
});

export const TOOL_CATALOG: Record<string, ToolMetadata> = {
  // --- Schema tools ---
  panproto_validate: read("Validate Schema"),
  panproto_normalize: read("Normalize Schema"),
  panproto_scaffold: read("Scaffold Test Data"),
  panproto_typecheck: read("Typecheck Migration"),
  panproto_health: read("Health Check"),
  panproto_verify: read("Verify Equations"),

  // --- Migration tools ---
  panproto_check_existence: read("Check Migration Existence"),
  panproto_lift: read("Lift Data Through Migration"),
  panproto_auto_migrate: read("Auto-Discover Migration"),
  panproto_integrate: read("Integrate Schemas"),

  // --- Diff tools ---
  panproto_diff: read("Schema Diff"),
  panproto_classify: read("Classify Change"),

  // --- Lens tools ---
  panproto_lens_generate: read("Generate Lens Chain"),
  panproto_lens_apply: read("Apply Lens Chain"),
  panproto_lens_verify: read("Verify Lens Laws"),
  panproto_lens_compose: read("Compose Lens Chains"),
  panproto_lens_inspect: read("Inspect Lens Chain"),
  panproto_lens_check: read("Check Lens Applicability"),
  panproto_lens_lift: read("Lift Lens Along Morphism"),

  // --- Data conversion tools ---
  panproto_convert: writeDestructive("Convert Data", "This will convert data files between schemas. Output files will be written to disk."),
  panproto_batch_migrate: writeDestructive("Batch Migrate Data", "This will migrate an entire directory of data files in place. Use --dry-run to preview."),
  panproto_data_status: read("Data Status"),
  panproto_data_sync: writeDestructive("Sync Data to Schema", "This will sync data files to the target schema version via VCS history."),

  // --- Parse tools ---
  panproto_parse_file: read("Parse File"),
  panproto_parse_project: read("Parse Project"),
  panproto_parse_emit: read("Parse and Emit"),

  // --- Expression tools ---
  panproto_eval_expr: read("Evaluate Expression"),
  panproto_parse_expr: read("Parse Expression"),
  panproto_fmt_expr: read("Format Expression"),
  panproto_check_expr: read("Check Expression Syntax"),
  panproto_gat_eval: read("Evaluate GAT Term"),
  panproto_gat_check: read("Typecheck GAT Term"),

  // --- VCS read tools ---
  panproto_vcs_status: read("VCS Status"),
  panproto_vcs_log: read("VCS Log"),
  panproto_vcs_diff: read("VCS Diff"),
  panproto_vcs_blame: read("VCS Blame"),
  panproto_vcs_show: read("VCS Show"),
  panproto_vcs_reflog: read("VCS Reflog"),
  panproto_vcs_bisect: read("VCS Bisect", false),
  panproto_vcs_branch_list: read("List Branches"),
  panproto_vcs_tag_list: read("List Tags"),
  panproto_vcs_stash_list: read("List Stashes"),

  // --- VCS write tools ---
  panproto_vcs_init: writeAdditive("Initialize Repository", true),
  panproto_vcs_add: writeAdditive("Stage Schema"),
  panproto_vcs_commit: writeAdditive("Commit Schema"),
  panproto_vcs_branch_create: writeAdditive("Create Branch"),
  panproto_vcs_tag_create: writeAdditive("Create Tag"),
  panproto_vcs_stash_push: writeAdditive("Stash Changes"),

  // --- VCS destructive tools ---
  panproto_vcs_checkout: writeDestructive("Checkout Branch", "This will switch the working schema to another branch or commit. Unstaged changes may be lost."),
  panproto_vcs_merge: writeDestructive("Merge Branch", "This will merge a branch into the current branch using pushout-based schema integration."),
  panproto_vcs_rebase: writeDestructive("Rebase Branch", "This will rebase the current branch onto another. Commit history will be rewritten."),
  panproto_vcs_cherry_pick: writeDestructive("Cherry-Pick Commit", "This will apply a single commit from another branch to the current branch."),
  panproto_vcs_reset: writeDestructive("Reset HEAD", "This will move HEAD and may discard schema changes. Use --soft to keep staged changes."),
  panproto_vcs_stash_pop: writeDestructive("Pop Stash", "This will apply and remove the most recent stash entry."),
  panproto_vcs_branch_delete: writeDestructive("Delete Branch", "This will delete the named branch."),
  panproto_vcs_tag_delete: writeDestructive("Delete Tag", "This will delete the named tag."),
  panproto_vcs_gc: writeDestructive("Garbage Collect", "This will remove unreachable objects from the repository store."),

  // --- Theory tools ---
  panproto_theory_validate: read("Validate Theory"),
  panproto_theory_compile: read("Compile Theory"),
  panproto_theory_compile_dir: read("Compile Theory Directory"),
  panproto_theory_check_morphism: read("Check Morphism"),
  panproto_theory_recompose: read("Recompose Theory"),
  panproto_theory_check_coercion_laws: read("Check Coercion Laws"),

  // --- Enrichment tools ---
  panproto_enrich_add_default: writeAdditive("Add Default Value"),
  panproto_enrich_add_coercion: writeAdditive("Add Coercion"),
  panproto_enrich_add_merger: writeAdditive("Add Merger"),
  panproto_enrich_add_policy: writeAdditive("Add Policy"),
  panproto_enrich_list: read("List Enrichments"),
  panproto_enrich_remove: writeDestructive("Remove Enrichment", "This will remove the named enrichment from the HEAD schema."),

  // --- Git bridge tools ---
  panproto_git_import: writeDestructive("Import Git History", "This will import git repository history into the panproto VCS store."),
  panproto_git_export: writeDestructive("Export to Git", "This will export panproto VCS history to a new git repository."),

  // --- Audit tool ---
  panproto_session_audit: read("Session Audit Log"),
};
