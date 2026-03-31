# @panproto/mcp-server

MCP (Model Context Protocol) server for panproto, exposing schema migration operations to Claude Desktop, VS Code, and other MCP-compatible clients.

## Installation

```sh
npm install -g @panproto/mcp-server
```

Requires the `schema` CLI to be installed and available on `$PATH`.

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

## Tools (18)

| Tool | Description |
|------|-------------|
| `panproto_validate` | Validate a schema against a protocol |
| `panproto_normalize` | Canonicalize a schema |
| `panproto_scaffold` | Generate a skeleton schema |
| `panproto_check_existence` | Check migration validity |
| `panproto_compile` | Compile a migration |
| `panproto_lift` | Apply migration to a record |
| `panproto_diff` | Structural diff between schemas |
| `panproto_classify` | Classify schema change compatibility |
| `panproto_lens_generate` | Auto-generate a lens |
| `panproto_lens_apply` | Apply a lens to data |
| `panproto_lens_verify` | Verify lens round-trip laws |
| `panproto_convert` | Convert data between protocols |
| `panproto_convert_schema` | Translate a schema between protocols |
| `panproto_parse_file` | Parse source file (248 languages) |
| `panproto_parse_emit` | Round-trip parse and emit |
| `panproto_eval_expr` | Evaluate an expression |
| `panproto_vcs_status` | Show VCS status |
| `panproto_vcs_log` | Show commit history |

## Resources (3)

| URI | Description |
|-----|-------------|
| `panproto://protocols` | 50 protocol definitions |
| `panproto://codecs` | 50+ I/O codecs |
| `panproto://grammars` | 248 language parsers |

## Prompts (3)

| Prompt | Description |
|--------|-------------|
| `migration-plan` | Plan a migration between two schemas |
| `schema-review` | Review a schema for best practices |
| `compatibility-report` | Analyze cross-protocol compatibility |

## Development

```sh
npm install
npm run dev    # run with tsx (hot reload)
npm run build  # compile TypeScript
npm start      # run compiled output
```

## License

MIT
