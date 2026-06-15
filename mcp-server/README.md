# @panproto/mcp-server

MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) server for [panproto](https://github.com/panproto/panproto), exposing 72 schema operations to Claude Desktop, VS Code, and other MCP-compatible clients. Every tool is classified by risk, annotated with MCP tool hints, and destructive operations gate on user approval.

## Installation

```sh
npm install -g @panproto/mcp-server
```

Requires the `schema` CLI to be installed and available on `$PATH`:

```sh
brew install panproto/tap/panproto-cli
# or
cargo install panproto-cli
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "panproto": {
      "command": "panproto-mcp-server"
    }
  }
}
```

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "claude.mcpServers": {
    "panproto": {
      "command": "panproto-mcp-server"
    }
  }
}
```

## Security and approvals

Every tool is classified by risk level and annotated with MCP `ToolAnnotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).

### Risk tiers

| Tier | Count | Approval | Examples |
|------|-------|----------|----------|
| **Read-only** | 47 | Auto-approved | validate, diff, log, parse_file, eval_expr |
| **Write-additive** | 10 | Auto-approved | init, add, commit, branch_create, enrich_add_default |
| **Write-destructive** | 15 | Requires user confirmation | merge, rebase, reset, batch_migrate, git_import |

### Approval flow

For destructive operations, the server uses MCP elicitation (`elicitation/create` with `form` mode) to request explicit user confirmation before executing. The user sees what will happen and can accept, decline, or cancel.

If the MCP client does not support elicitation, the tool returns a warning and requires a `confirmed: true` parameter on re-call.

### Audit log

Every tool invocation is recorded in a session-scoped, append-only audit log with timestamp, tool name, risk level, arguments, approval status, result, and duration. Inspect the log via the `panproto_session_audit` tool.

## Tools (72)

Tool descriptions are accurate against panproto v0.52.1. All tools are registered via `registerTool` with deterministic alphabetical ordering for LLM prompt cache consistency.

### Schema (6)

| Tool | Description |
|------|-------------|
| `panproto_validate` | Validate a schema against a protocol |
| `panproto_normalize` | Canonicalize a schema (collapse refs, merge equivalent elements via `--identify`) |
| `panproto_scaffold` | Generate test data from protocol theory via free model construction |
| `panproto_typecheck` | Type-check a migration morphism at the GAT level |
| `panproto_verify` | Verify that a schema satisfies all equations in the protocol theory |
| `panproto_health` | Check CLI installation and version (returns structured output) |

### Theory (6)

| Tool | Description |
|------|-------------|
| `panproto_theory_validate` | Validate a theory document (theory, morphism, composition, protocol, class, instance, inductive bodies) |
| `panproto_theory_compile` | Compile a theory document to theories, morphisms, and protocols |
| `panproto_theory_compile_dir` | Compile every theory document in a directory |
| `panproto_theory_check_morphism` | Validate a theory morphism document |
| `panproto_theory_recompose` | Replay a composition and print the resulting theory |
| `panproto_theory_check_coercion_laws` | Sample-based verification of declared Iso/Retraction/Projection/Opaque coercion laws |

### Migration (4)

| Tool | Description |
|------|-------------|
| `panproto_check_existence` | Check migration existence conditions between two schemas |
| `panproto_lift` | Apply migration to a data record (restrict/sigma/pi directions) |
| `panproto_auto_migrate` | Discover a migration via the 14-strategy alignment ladder |
| `panproto_integrate` | Compute pushout (integration) of two schemas with universal-property verification |

### Diff (2)

| Tool | Description |
|------|-------------|
| `panproto_diff` | Structural diff with rename detection and optic-kind classification |
| `panproto_classify` | Classify schema change as compatible, backward-compatible, or breaking |

### Lens (7)

| Tool | Description |
|------|-------------|
| `panproto_lens_generate` | Auto-generate a protolens chain with stringency tiers, ranked candidates, and explanations |
| `panproto_lens_apply` | Apply a protolens chain (forward or backward with complement) |
| `panproto_lens_verify` | Verify GetPut, PutGet, and PutPut round-trip laws on test data |
| `panproto_lens_compose` | Compose two protolens chains via vertical composition |
| `panproto_lens_inspect` | Inspect chain steps, preconditions, effects, and optic kind |
| `panproto_lens_check` | Check whether a chain is applicable against a set of schemas |
| `panproto_lens_lift` | Lift a protolens chain along a theory morphism |

### Data (4)

| Tool | Description |
|------|-------------|
| `panproto_convert` | Convert data between schemas using protolens chains |
| `panproto_batch_migrate` | Migrate a directory of data files via VCS history (supports `--dry-run`) |
| `panproto_data_status` | Report data staleness relative to the current schema version |
| `panproto_data_sync` | Sync data to target schema via VCS, optionally recording edit logs |

### Parse (3)

| Tool | Description |
|------|-------------|
| `panproto_parse_file` | Parse a source file into a schema (259 languages via tree-sitter) |
| `panproto_parse_project` | Parse all files in a directory into a unified project schema |
| `panproto_parse_emit` | Round-trip parse and emit (verified via the parse/decorate/emit lens) |

### Expression (6)

| Tool | Description |
|------|-------------|
| `panproto_eval_expr` | Evaluate a panproto expression (59 builtins: arithmetic, string, list, record, graph traversal) |
| `panproto_parse_expr` | Parse an expression and print its AST |
| `panproto_fmt_expr` | Pretty-print an expression in canonical form |
| `panproto_check_expr` | Check expression syntax without evaluation |
| `panproto_gat_eval` | Evaluate a GAT term from a JSON file |
| `panproto_gat_check` | Type-check a GAT term (dependent sort resolution) |

### VCS read (10)

| Tool | Description |
|------|-------------|
| `panproto_vcs_status` | Show staged, modified, untracked schema files |
| `panproto_vcs_log` | Show commit history (supports `--graph`, `--author`, `--grep`, `--data`) |
| `panproto_vcs_diff` | Diff schema versions (supports `--theory`, `--lens`, `--optic-kind`) |
| `panproto_vcs_blame` | Show which commit introduced a specific schema element |
| `panproto_vcs_show` | Inspect a commit, schema, or content-addressed object |
| `panproto_vcs_reflog` | Show ref mutation history |
| `panproto_vcs_bisect` | Binary search for the commit that introduced a breaking change |
| `panproto_vcs_branch_list` | List all branches |
| `panproto_vcs_tag_list` | List all tags |
| `panproto_vcs_stash_list` | List stash entries |

### VCS write (16)

| Tool | Risk | Description |
|------|------|-------------|
| `panproto_vcs_init` | additive | Initialize a panproto repository |
| `panproto_vcs_add` | additive | Stage a schema (with optional `--data`, `--dry-run`) |
| `panproto_vcs_commit` | additive | Create a commit from staged schemas |
| `panproto_vcs_branch_create` | additive | Create a branch |
| `panproto_vcs_tag_create` | additive | Create a tag (plain or annotated) |
| `panproto_vcs_stash_push` | additive | Save working state to stash |
| `panproto_vcs_checkout` | destructive | Switch branches or commits |
| `panproto_vcs_merge` | destructive | Merge via pushout-based schema integration |
| `panproto_vcs_rebase` | destructive | Rebase (rewrites commit history) |
| `panproto_vcs_cherry_pick` | destructive | Apply a single commit from another branch |
| `panproto_vcs_reset` | destructive | Move HEAD (`--soft` or `--hard`) |
| `panproto_vcs_stash_pop` | destructive | Apply and remove the most recent stash |
| `panproto_vcs_branch_delete` | destructive | Delete a branch |
| `panproto_vcs_tag_delete` | destructive | Delete a tag |
| `panproto_vcs_gc` | destructive | Garbage collect unreachable objects |

### Enrichment (6)

| Tool | Risk | Description |
|------|------|-------------|
| `panproto_enrich_add_default` | additive | Add default value expression to a vertex |
| `panproto_enrich_add_coercion` | additive | Add coercion between vertex kinds |
| `panproto_enrich_add_merger` | additive | Add merger expression for conflict resolution |
| `panproto_enrich_add_policy` | additive | Add conflict resolution policy |
| `panproto_enrich_list` | read | List all enrichments on HEAD |
| `panproto_enrich_remove` | destructive | Remove a named enrichment |

### Git bridge (2)

| Tool | Risk | Description |
|------|------|-------------|
| `panproto_git_import` | destructive | Import git history into panproto VCS |
| `panproto_git_export` | destructive | Export panproto VCS to a git repository |

### Audit (1)

| Tool | Description |
|------|-------------|
| `panproto_session_audit` | View the session audit log (returns structured output with entries and summary) |

## Resources (3)

| URI | Content |
|-----|---------|
| `panproto://protocols` | 50 protocol definitions + 19 annotation protocols |
| `panproto://codecs` | 50+ I/O codecs organized by pathway (JSON/SIMD, XML/quick-xml, tabular/memchr, binary, graph, relational, config, domain) |
| `panproto://grammars` | 259 language parsers via tree-sitter across 11 grammar groups |

## Prompts (6)

| Prompt | Description |
|--------|-------------|
| `migration-plan` | Plan a migration between two schema versions |
| `schema-review` | Review a schema for best practices |
| `compatibility-report` | Analyze cross-protocol compatibility |
| `vcs-workflow` | Guide through init, add, commit, branch, merge |
| `cross-protocol-translation` | Translate data between two protocols |
| `code-schema-diff` | Parse two source files, diff their schemas, generate a lens |

## Architecture

The server wraps the `schema` CLI via `execFile`. Each tool constructs the correct CLI arguments, and the policy engine intercepts destructive calls to request user approval via MCP elicitation.

```
MCP Client
  └─ JSON-RPC (stdio)
       └─ McpServer (registerTool, sorted alphabetically)
            └─ PolicyEngine (classify → audit → elicit if destructive)
                 └─ execFile("schema", [...args])
                      └─ panproto CLI
```

## Development

```sh
npm install
npm run dev    # run with tsx (hot reload)
npm run build  # compile TypeScript
npm start      # run compiled output
```

## License

MIT
