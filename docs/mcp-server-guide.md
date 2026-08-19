# MCP Server Guide

## Overview

The `@panproto/mcp-server` package exposes panproto operations to any [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) compatible client: Claude Desktop, VS Code with the Claude extension, or any other MCP host.

The server wraps the `schema` CLI and the `@panproto/core` WASM module, providing 72 tools (with tool annotations, approval gates, and audit logging), 3 resources, and 6 prompt templates.

## Security and Approvals

Every tool is classified by risk level and annotated with MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`):

- **Read-only** (47 tools): analysis, inspection, diffing, validation. Auto-approved, no confirmation needed.
- **Write-additive** (10 tools): VCS init/add/commit, enrichment additions, branch/tag creation. Auto-approved by default.
- **Write-destructive** (15 tools): data conversion and migration, VCS merge/rebase/reset/gc, stash pop, git import/export. Require explicit user approval via MCP elicitation before execution.

### Approval flow

For destructive operations, the server requests confirmation via MCP elicitation (`elicitation/create` with `form` mode). The user sees what will happen and confirms or cancels. If the MCP client does not support elicitation, the tool requires a `confirmed: true` parameter on re-call.

### Audit log

Every tool invocation is recorded in a session-scoped audit log with: timestamp, tool name, risk level, arguments, approval status, result, and duration. The `panproto_session_audit` tool exposes this log.

### Policy configuration

The server accepts environment variables to customize policy:
- `PANPROTO_AUTO_APPROVE_READS=true` (default: true)
- `PANPROTO_AUTO_APPROVE_ADDITIVE=true` (default: true)
- `PANPROTO_REQUIRE_APPROVAL_DESTRUCTIVE=true` (default: true)
- `PANPROTO_AUDIT_LOG=true` (default: true)

## Installation

```sh
npm install -g @panproto/mcp-server
```

Requires the `schema` CLI to be installed and available on `$PATH`.

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

## Tools

### Schema tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_validate` | Validate a schema against its protocol | `schema_path`, `protocol` |
| `panproto_normalize` | Canonicalize a schema | `schema_path`, `protocol` |
| `panproto_scaffold` | Generate minimal test data from a protocol theory | `protocol`, `schema_path` |
| `panproto_typecheck` | Type-check a migration at the GAT level | `src`, `tgt`, `migration` |
| `panproto_verify` | Verify a schema satisfies its theory's equations | `schema_path`, `protocol` |
| `panproto_health` | Report toolchain availability | (none) |

### Migration tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_check_existence` | Check whether a migration satisfies its existence conditions | `src`, `tgt`, `mapping` |
| `panproto_lift` | Apply a migration to a record (restrict, sigma, or pi) | `migration`, `record` |
| `panproto_auto_migrate` | Discover the optimal span between two schemas | `old_schema`, `new_schema`, `total`, `span`, `monic`, `json` |
| `panproto_integrate` | Merge two schemas by computing their pushout | `left`, `right`, `auto_overlap` |

`panproto_auto_migrate` runs the span search, which never refuses for want of a match. `total`, the default, and `span` are three rungs of one strictness ladder over the same search; `total` and `span` are mutually exclusive. With `json`, the result is the span's right leg, a migration out of the apex, whose declared domain is the apex digest rather than the source schema.

### Diff tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_diff` | Structural diff between two schemas | `src`, `tgt` |
| `panproto_classify` | Classify a change as compatible/backward/breaking | `src`, `tgt`, `protocol` |

### Lens tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_lens_generate` | Auto-generate a lens chain between two schemas | `old_schema`, `new_schema`, `protocol` |
| `panproto_lens_apply` | Apply a lens chain to data | `chain`, `data`, `protocol` |
| `panproto_lens_verify` | Generate a lens between two schemas and report its shape | `data`, `protocol`, `schema` |
| `panproto_lens_compose` | Compose two chains | `chain1`, `chain2`, `protocol` |
| `panproto_lens_inspect` | Report each step, its preconditions, and its optic kind | `chain`, `protocol` |
| `panproto_lens_check` | Check a chain's applicability across a directory of schemas | `chain`, `schemas_dir`, `protocol` |
| `panproto_lens_lift` | Lift a chain along a theory morphism | `chain`, `morphism` |

### Data tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_convert` | Convert data between two schemas or through a chain | `data`, `protocol`, `from`, `to`, `chain` |
| `panproto_batch_migrate` | Migrate a directory through the repository's schema history | `data_dir`, `range`, `dry_run` |
| `panproto_data_status` | Report which records are stale | `data_dir` |
| `panproto_data_sync` | Sync data to a target schema version via VCS | `data_dir`, `target` |

### Parse tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_parse_file` | Parse a source file into a full-AST schema | `file_path` |
| `panproto_parse_project` | Parse a directory into one project schema | `path` |
| `panproto_parse_emit` | Round-trip parse and emit | `file_path` |

### Expression tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_eval_expr` | Evaluate a panproto expression | `expr` |
| `panproto_parse_expr` | Parse an expression and print its AST | `expr` |
| `panproto_fmt_expr` | Pretty-print an expression in canonical form | `expr` |
| `panproto_check_expr` | Report syntax errors in an expression | `expr` |
| `panproto_gat_eval` | Evaluate a JSON-encoded GAT term | `path` |
| `panproto_gat_check` | Type-check a JSON-encoded GAT term | `path` |

### VCS tools

Ten read tools (`status`, `log`, `diff`, `blame`, `show`, `reflog`, `bisect`, `branch_list`, `tag_list`, `stash_list`) and fifteen write tools (`init`, `add`, `commit`, `checkout`, `branch_create`, `branch_delete`, `tag_create`, `tag_delete`, `merge`, `rebase`, `cherry_pick`, `reset`, `stash_push`, `stash_pop`, `gc`), each prefixed `panproto_vcs_`.

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_vcs_status` | Show VCS status | `repo_path` |
| `panproto_vcs_log` | Show commit history | `repo_path`, `limit` (optional) |

### Theory, enrichment, git bridge, and audit

Six theory tools (`theory_validate`, `theory_compile`, `theory_compile_dir`, `theory_check_morphism`, `theory_recompose`, `theory_check_coercion_laws`), six enrichment tools (`enrich_add_default`, `enrich_add_coercion`, `enrich_add_merger`, `enrich_add_policy`, `enrich_list`, `enrich_remove`), two git bridge tools (`git_import`, `git_export`), and `panproto_session_audit`.

## Resources

Resources expose panproto's catalog data as structured information that MCP clients can browse.

| URI | Description |
|-----|-------------|
| `panproto://protocols` | All 54 protocol definitions with their theory composition |
| `panproto://codecs` | All 50+ I/O codecs with supported formats |
| `panproto://grammars` | All 261 supported language parsers |

## Prompts

Prompt templates generate structured prompts for common analysis tasks.

| Prompt | Description |
|--------|-------------|
| `migration-plan` | Plan a migration between two schema versions |
| `schema-review` | Review a schema against best practices |
| `compatibility-report` | Analyze cross-protocol compatibility |
| `vcs-workflow` | Guide through init, add, commit, branch, merge |
| `cross-protocol-translation` | Translate data between two protocols via the universal schema graph |
| `code-schema-diff` | Parse two source files, diff their schemas, generate a lens |

## Architecture

The MCP server uses two execution paths:

1. **In-process WASM** (via `@panproto/core`): for schema validation, migration, lens, diff, and expression operations. Fast because no process spawning.
2. **CLI subprocess** (via `schema` command): for VCS operations and file parsing that require filesystem access.

All tools return structured JSON results that MCP clients can render appropriately.
