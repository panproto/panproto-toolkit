# MCP Server Guide

## Overview

The `@panproto/mcp-server` package exposes panproto operations to any [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) compatible client: Claude Desktop, VS Code with the Claude extension, or any other MCP host.

The server wraps the `schema` CLI and the `@panproto/core` WASM module, providing 18 tools, 3 resources, and 3 prompt templates.

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
| `panproto_scaffold` | Generate a skeleton schema | `protocol`, `name` |

### Migration tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_check_existence` | Check if a migration is valid | `src_schema`, `tgt_schema` |
| `panproto_compile` | Compile a migration for fast execution | `src_schema`, `tgt_schema`, `migration` |
| `panproto_lift` | Apply a compiled migration to a record | `migration_handle`, `record` |

### Diff tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_diff` | Structural diff between two schemas | `src`, `tgt` |
| `panproto_classify` | Classify a change as compatible/backward/breaking | `src`, `tgt`, `protocol` |

### Lens tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_lens_generate` | Auto-generate a lens between two schemas | `src`, `tgt` |
| `panproto_lens_apply` | Apply a lens to data (get direction) | `lens`, `record` |
| `panproto_lens_verify` | Verify lens round-trip laws | `lens`, `instance` |

### Conversion tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_convert` | Convert data between protocols | `src_protocol`, `tgt_protocol`, `data` |
| `panproto_convert_schema` | Translate a schema between formats | `src_protocol`, `tgt_protocol`, `schema` |

### Parse tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_parse_file` | Parse a source file into panproto schema | `file_path` |
| `panproto_parse_emit` | Round-trip parse and emit | `file_path` |

### Expression tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_eval_expr` | Evaluate a panproto expression | `expr`, `env` (optional) |

### VCS tools

| Tool | Description | Key inputs |
|------|-------------|-----------|
| `panproto_vcs_status` | Show VCS status | `repo_path` |
| `panproto_vcs_log` | Show commit history | `repo_path`, `limit` (optional) |

## Resources

Resources expose panproto's catalog data as structured information that MCP clients can browse.

| URI | Description |
|-----|-------------|
| `panproto://protocols` | All 50 protocol definitions with their theory composition |
| `panproto://codecs` | All 50+ I/O codecs with supported formats |
| `panproto://grammars` | All 248 supported language parsers |

## Prompts

Prompt templates generate structured prompts for common analysis tasks.

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `migration-plan` | Plan a migration between two schema versions | `src_path`, `tgt_path` |
| `schema-review` | Review a schema against best practices | `schema_path`, `protocol` |
| `compatibility-report` | Analyze cross-protocol compatibility | `schema_a_path`, `schema_b_path` |

## Architecture

The MCP server uses two execution paths:

1. **In-process WASM** (via `@panproto/core`): for schema validation, migration, lens, diff, and expression operations. Fast because no process spawning.
2. **CLI subprocess** (via `schema` command): for VCS operations and file parsing that require filesystem access.

All tools return structured JSON results that MCP clients can render appropriately.
