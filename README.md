# panproto-toolkit

> Written for panproto v0.37.0. See [keeping up to date](#keeping-up-to-date) for version tracking.

Claude Code skills, agents, MCP server, project templates, and CI integrations for working with [panproto](https://github.com/panproto/panproto), the schematic version control engine.

These are **user-facing** tools for building applications with panproto.

## Quick install

```sh
curl -sSf https://raw.githubusercontent.com/panproto/panproto-toolkit/main/install.sh | bash
```

This clones the repo and symlinks skills/agents into your `~/.claude/` directory.

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI or IDE extension
- panproto CLI (`schema`): `brew install panproto/tap/panproto-cli` or `cargo install panproto-cli`

## Skills

Invoke any skill in Claude Code with `/panproto-<name>`.

### Core workflow

| Skill | Command | What it does |
|-------|---------|-------------|
| **getting-started** | `/panproto-getting-started <ts\|python\|rust>` | Scaffold a new panproto project with CLI, manifest, and starter schema |
| **define-schema** | `/panproto-define-schema <protocol>` | Define schemas using SchemaBuilder with protocol-specific guidance |
| **build-migration** | `/panproto-build-migration` | Build migrations: morphisms, existence checking, compilation, lifting |
| **use-lenses** | `/panproto-use-lenses` | Bidirectional lenses: get/put, complements, combinators, auto-generation |
| **breaking-change-ci** | `/panproto-breaking-change-ci` | Set up breaking change detection and CI gates |
| **convert-data** | `/panproto-convert-data <from> <to>` | Convert data between any of 50 protocols |
| **schema-vcs** | `/panproto-schema-vcs` | Schema version control: commit, branch, merge, diff, data versioning |

### Advanced

| Skill | Command | What it does |
|-------|---------|-------------|
| **protolenses** | `/panproto-protolenses` | Schema-parameterized lens families, chains, optic classification |
| **field-transforms** | `/panproto-field-transforms` | Value-dependent transforms with the expression language |
| **expression-language** | `/panproto-expression-language` | Reference for the ~50-builtin functional expression language |
| **query-instances** | `/panproto-query-instances` | Query and filter instances with predicates and projections |
| **cross-protocol** | `/panproto-cross-protocol` | Cross-protocol translation with loss analysis |
| **build-protocol** | `/panproto-build-protocol` | Define custom protocols by composing building-block theories |
| **full-ast-parsing** | `/panproto-full-ast-parsing` | Parse 248 programming languages via tree-sitter |
| **typeclasses** | `/panproto-typeclasses` | Class / instance DSL bodies and the `class!`/`instance!`/`derive_theory!` proc-macros |
| **rewriting** | `/panproto-rewriting` | Directed equations, Knuth-Bendix confluence, LPO termination, normalization |
| **implicit-arguments** | `/panproto-implicit-arguments` | `Implicit::Yes` tag, Robinson unification at call sites, when to mark a parameter implicit |
| **closed-sorts-and-case** | `/panproto-closed-sorts-and-case` | `SortClosure::Closed(ops)`, `Term::Case`, exhaustive pattern matching |
| **repl** | `/panproto-repl` | Quickstart for the `panproto-repl` interactive shell |

### SDK guides

| Skill | Command | What it does |
|-------|---------|-------------|
| **sdk-typescript** | `/panproto-sdk-typescript` | Complete @panproto/core TypeScript SDK guide |
| **sdk-python** | `/panproto-sdk-python` | Complete panproto Python SDK guide |
| **sdk-rust** | `/panproto-sdk-rust` | Complete panproto-core Rust library guide |

### CI integration

| Skill | Command | What it does |
|-------|---------|-------------|
| **ci-github-actions** | `/panproto-ci-github-actions` | Generate GitHub Actions workflows for schema checks |
| **ci-pre-commit** | `/panproto-ci-pre-commit` | Set up pre-commit hooks for schema validation |
| **ci-breaking-gate** | `/panproto-ci-breaking-gate` | PR gate that blocks unacknowledged breaking schema changes |

### Contributing

| Skill | Command | What it does |
|-------|---------|-------------|
| **contributing** | `/panproto-contributing` | Onramp for panproto contributors: repo setup, architecture, PR workflow |

## Agents

Agents are specialized sub-processes that Claude Code can delegate to for focused analysis.

| Agent | Model | What it does |
|-------|-------|-------------|
| **migration-advisor** | Opus | Analyzes two schema versions and recommends a migration strategy |
| **compatibility-checker** | Sonnet | Checks cross-protocol compatibility and reports translation loss |
| **data-converter** | Sonnet | Converts data between formats with fidelity reporting |
| **schema-reviewer** | Opus | Reviews schema definitions for best practices and migration-friendliness |
| **vcs-assistant** | Sonnet | Guides schema VCS workflows: branching, merging, history exploration |

## MCP server

The `@panproto/mcp-server` package exposes panproto operations to any MCP-compatible client (Claude Desktop, VS Code, other AI tools).

```sh
npm install -g @panproto/mcp-server
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "panproto": {
      "command": "panproto-mcp-server"
    }
  }
}
```

**18 tools** across schema validation, migration, diffing, lenses, data conversion, parsing, expressions, and version control. **3 resources** exposing the protocol/codec/grammar catalogs. **3 prompt templates** for migration planning, schema review, and compatibility analysis.

See [mcp-server/README.md](mcp-server/README.md) for full documentation.

## Templates

Project scaffolds for getting started quickly:

- `templates/ts-project/` : TypeScript project with @panproto/core
- `templates/python-project/` : Python project with panproto
- `templates/rust-project/` : Rust project with panproto-core
- `templates/github-actions/` : CI workflow templates

## Learning path

If you are new to panproto, work through the skills in this order:

1. `/panproto-getting-started` to scaffold a project
2. `/panproto-define-schema` to learn schema construction
3. `/panproto-build-migration` to migrate between schema versions
4. `/panproto-use-lenses` for bidirectional transforms
5. `/panproto-breaking-change-ci` to protect your schemas in CI

Each skill references specific chapters in the [panproto tutorial](https://panproto.dev/tutorial/) for deeper understanding. See [docs/tutorial-map.md](docs/tutorial-map.md) for the full mapping.

## Keeping up to date

This toolkit is written for a specific panproto version. When panproto releases a new version:

1. Check the [panproto CHANGELOG](https://github.com/panproto/panproto/blob/main/CHANGELOG.md) for API changes
2. Run `git pull` in your panproto-toolkit clone to get updates
3. The MCP server version tracks the panproto version

To update:
```sh
cd ~/.local/share/panproto-toolkit && git pull
npm update -g @panproto/mcp-server
```

## License

MIT
