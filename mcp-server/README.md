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

## Tools (31)

Tool descriptions are accurate against panproto 0.45.0. The theory tools (`panproto_theory_validate`, `panproto_theory_compile`) handle the `class`, `instance`, and `inductive` document body types in addition to `theory`, `morphism`, `composition`, and `protocol`. The class / inductive / derive_theory document bodies (and the matching Rust proc-macros) accept dependent sorts in argument and output positions as of panproto 0.44.0; the same surface is exposed in Python as `panproto.TheoryBuilder` (0.45.0) and through the panproto-theory-dsl loaders (`Theory.from_json` / `from_yaml` / `from_nickel` / `from_path`, also 0.44.0). The 0.38.0 coercion-law-verifier is wrapped by `panproto_theory_check_coercion_laws`. Confluence and termination analyses are available via the library API (`panproto_gat::rewriting`) but are not yet exposed as CLI verbs, so the MCP server does not wrap them.

### Schema
| Tool | Description |
|------|-------------|
| `panproto_validate` | Validate a schema against a protocol |
| `panproto_normalize` | Canonicalize a schema |
| `panproto_scaffold` | Generate test data from protocol theory |
| `panproto_typecheck` | Type-check a migration at the GAT level |
| `panproto_health` | Check CLI installation and version |

### Theory
| Tool | Description |
|------|-------------|
| `panproto_theory_validate` | Validate a theory document (load + typecheck) |
| `panproto_theory_compile` | Compile a theory document to theories / morphisms / protocols |
| `panproto_theory_compile_dir` | Compile every theory document in a directory |
| `panproto_theory_check_morphism` | Validate a theory morphism document |
| `panproto_theory_recompose` | Replay a composition and print the resulting theory |
| `panproto_theory_check_coercion_laws` | Sample-based verification of declared coercion laws (0.38.0+) |

### Migration
| Tool | Description |
|------|-------------|
| `panproto_check_existence` | Check migration existence conditions |
| `panproto_lift` | Apply migration to a data record |
| `panproto_auto_migrate` | Discover a migration via CSP search |
| `panproto_integrate` | Compute pushout of two schemas |

### Diff
| Tool | Description |
|------|-------------|
| `panproto_diff` | Structural diff with rename detection |
| `panproto_classify` | Classify change compatibility |

### Lens
| Tool | Description |
|------|-------------|
| `panproto_lens_generate` | Auto-generate a protolens chain |
| `panproto_lens_apply` | Apply lens (forward or backward) |
| `panproto_lens_verify` | Verify round-trip laws |
| `panproto_lens_compose` | Compose two chains |
| `panproto_lens_inspect` | Inspect chain steps and effects |

### Data
| Tool | Description |
|------|-------------|
| `panproto_convert` | Convert data between schemas |
| `panproto_batch_migrate` | Migrate a directory via VCS history |
| `panproto_data_status` | Report data staleness |

### Parse
| Tool | Description |
|------|-------------|
| `panproto_parse_file` | Parse source file (248 languages) |
| `panproto_parse_project` | Parse directory into project schema |
| `panproto_parse_emit` | Round-trip parse and emit |

### Expression
| Tool | Description |
|------|-------------|
| `panproto_eval_expr` | Evaluate an expression |
| `panproto_parse_expr` | Parse expression to AST |
| `panproto_fmt_expr` | Pretty-print expression |

### VCS
| Tool | Description |
|------|-------------|
| `panproto_vcs_status` | Show VCS status |
| `panproto_vcs_log` | Show commit history |
| `panproto_vcs_diff` | Diff schema versions |
| `panproto_vcs_blame` | Attribute elements to commits |

### Enrichment
| Tool | Description |
|------|-------------|
| `panproto_enrich_add_default` | Add default value to a vertex |
| `panproto_enrich_add_coercion` | Add type coercion expression |
| `panproto_enrich_list` | List all enrichments |

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
