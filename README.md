# panproto-toolkit

> Written for [panproto](https://github.com/panproto/panproto) v0.71.0. See [keeping up to date](#keeping-up-to-date) for version tracking.

Claude Code skills, agents, an MCP server, project templates, and CI integrations for working with panproto, the schematic version control engine.

panproto treats every schema language (ATProto, OpenAPI, Protobuf, GraphQL, Avro, SQL DDL, and [43 others](https://github.com/panproto/panproto/tree/main/crates/panproto-protocols)) as a view over a single graph format, and can also parse source code in [261 programming languages](https://github.com/panproto/panproto/tree/main/crates/panproto-grammars) via tree-sitter. The same diff/migrate/version-control workflow works on data schemas, API specs, config files, and code structure.

## Quick install

```sh
curl -sSf https://raw.githubusercontent.com/panproto/panproto-toolkit/main/install.sh | bash
```

This clones the repo, symlinks the skills, CI integrations, and agents into your `~/.claude/` directory, and builds and registers the MCP server. Pass `--no-mcp` to skip the last step.

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI or IDE extension
- panproto CLI (`schema`): `brew install panproto/tap/panproto-cli` or `cargo install panproto-cli`

## What's in the box

| Component | Count | Description |
|-----------|-------|-------------|
| [Skills](#skills) | 31 | Claude Code slash commands for panproto workflows |
| [CI skills](#ci-integration) | 3 | The `ci-integrations/` directory, installed as three more slash commands |
| [Agents](#agents) | 6 | Specialized sub-agents for focused analysis |
| [MCP server](#mcp-server) | 72 tools | Model Context Protocol server with sandboxing and approvals |
| [Templates](#templates) | 5 | Project scaffolds (TypeScript, Python, Rust, Swift, GitHub Actions) |

## Skills

Invoke any skill in Claude Code with `/panproto-<name>`.

### Core workflow

| Skill | Command | What it does |
|-------|---------|-------------|
| **getting-started** | `/panproto-getting-started <ts\|python\|rust>` | Scaffold a new panproto project with CLI, manifest, and starter schema |
| **define-schema** | `/panproto-define-schema <protocol>` | Define schemas using SchemaBuilder with protocol-specific guidance |
| **build-migration** | `/panproto-build-migration` | Build migrations: the span search, existence checking, compilation, lifting |
| **use-lenses** | `/panproto-use-lenses` | Bidirectional lenses: get/put, complements, combinators, auto-generation |
| **breaking-change-ci** | `/panproto-breaking-change-ci` | Set up breaking change detection and CI gates |
| **coercion-law-checks** | `/panproto-coercion-law-checks` | Sample-based verification of coercion laws; CI gate against dishonest declarations |
| **convert-data** | `/panproto-convert-data` | Convert data between any of 54 protocols |
| **schema-vcs** | `/panproto-schema-vcs` | Schema version control: commit, branch, merge, diff, data versioning |

### Advanced

| Skill | Command | What it does |
|-------|---------|-------------|
| **protolenses** | `/panproto-protolenses` | Schema-parameterized lens families, chains, optic classification (Iso/Lens/Prism/Affine/Traversal) |
| **dependent-optics** | `/panproto-dependent-optics` | Scoped transforms with optic kind determined by edge type (prop->Lens, item->Traversal, variant->Prism) |
| **field-transforms** | `/panproto-field-transforms` | Value-dependent transforms with the expression language |
| **expression-language** | `/panproto-expression-language` | Reference for the 60-builtin functional expression language |
| **query-instances** | `/panproto-query-instances` | Query and filter instances with predicates and projections |
| **cross-protocol** | `/panproto-cross-protocol` | Cross-protocol translation with loss analysis |
| **build-protocol** | `/panproto-build-protocol` | Define custom protocols by composing building-block theories via colimit |
| **full-ast-parsing** | `/panproto-full-ast-parsing` | Parse 261 programming languages via tree-sitter; parse/decorate/emit lens (v0.48.0+) for verified round-trip emission |
| **decorate-schemas** | `/panproto-decorate-schemas` | Attach layout enrichment to hand-built schemas for source emission; Grothendieck fibration framing |
| **format-preserving** | `/panproto-format-preserving` | Lossless round-trips for JSON, XML, YAML, TOML, CSV, TSV via CstComplement |
| **lens-dsl** | `/panproto-lens-dsl` | Declarative lens specs in Nickel, JSON, or YAML |
| **companion-grammar-packs** | `/panproto-companion-grammar-packs` | spaCy-style pip-installable grammar packs: one per `panproto-grammars` group |
| **typeclasses** | `/panproto-typeclasses` | `class!` / `instance!` / `derive_theory!` proc-macros for GAT theories |
| **rewriting** | `/panproto-rewriting` | Directed equations, Knuth-Bendix confluence, LPO termination |
| **implicit-arguments** | `/panproto-implicit-arguments` | Robinson unification for implicit parameter inference |
| **closed-sorts-and-case** | `/panproto-closed-sorts-and-case` | Closed sorts, exhaustive `Term::Case` pattern matching |
| **repl** | `/panproto-repl` | Interactive shell for theories, terms, and morphisms |

### SDK guides

| Skill | Command | What it does |
|-------|---------|-------------|
| **sdk-typescript** | `/panproto-sdk-typescript` | Complete @panproto/core TypeScript SDK guide (WASM, 98-function boundary) |
| **sdk-python** | `/panproto-sdk-python` | Complete panproto Python SDK guide (PyO3, 47 classes, 41 functions) |
| **sdk-rust** | `/panproto-sdk-rust` | Complete panproto-core Rust library guide (feature flags, crate layout, the span search) |
| **sdk-haskell** | `/panproto-sdk-haskell` | Complete Haskell SDK guide (full parity over the `panproto-c` C ABI): per-domain capability typeclasses, standard-class integration, builders, the `MonadPanproto` effect layer, optics/lens adaptors |
| **sdk-swift** | `/panproto-sdk-swift` | Complete Swift SDK guide (SwiftPM package over the same C ABI): the six products, the `PanprotoEngine` global actor every engine call is isolated to, the fourteen handle classes, result-builder DSLs for schemas, migrations, and theories, typed `throws(PanprotoError)`, and the `PANPROTO_PARSE`/`PANPROTO_PROJECT`/`PANPROTO_GIT` package traits |

### CI integration

| Skill | Command | What it does |
|-------|---------|-------------|
| **github-actions** | `/panproto-github-actions` | Generate GitHub Actions workflows for schema checks |
| **pre-commit-hooks** | `/panproto-pre-commit-hooks` | Set up pre-commit hooks for schema validation |
| **breaking-change-gate** | `/panproto-breaking-change-gate` | PR gate that blocks unacknowledged breaking schema changes |

### Contributing

| Skill | Command | What it does |
|-------|---------|-------------|
| **contributing** | `/panproto-contributing` | Onramp for panproto contributors: repo setup, crate architecture, the four language bindings, PR workflow |

## Agents

Specialized sub-processes that Claude Code delegates to for focused analysis.

| Agent | Model | What it does |
|-------|-------|-------------|
| **migration-advisor** | Opus | Analyzes two schema versions and recommends a migration strategy from the span search and the 14-strategy alignment ladder |
| **compatibility-checker** | Sonnet | Checks cross-protocol compatibility from the largest common induced sub-schema, and reports translation loss |
| **data-converter** | Sonnet | Converts data between formats with fidelity reporting |
| **schema-reviewer** | Opus | Reviews schema definitions for best practices, constraint coverage, and migration-friendliness |
| **vcs-assistant** | Sonnet | Guides schema VCS workflows: branching, merging, pushout verification, history exploration |
| **code-transform** | Sonnet | Parse source files, compute diffs, generate lenses, emit transformed code via the parse->protolens->emit pipeline |

## MCP server

The [`@panproto/mcp-server`](mcp-server/) package exposes panproto operations to any MCP-compatible client (Claude Desktop, VS Code, other AI tools).

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

### Security and approvals

Every tool is classified by risk level and annotated with MCP tool hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`):

- **Read-only** (47 tools): analysis, inspection, diffing, validation. Auto-approved.
- **Write-additive** (10 tools): VCS init/add/commit, enrichment additions, branch/tag creation. Auto-approved.
- **Write-destructive** (15 tools): data migration, VCS merge/rebase/reset, git import/export. Gate on MCP elicitation-based user approval before executing.

All invocations are recorded in a session-scoped audit log accessible via `panproto_session_audit`.

### 72 tools across 13 categories

| Category | Tools | Examples |
|----------|-------|---------|
| Schema | 6 | validate, normalize, scaffold, typecheck, verify, health |
| Theory | 6 | validate, compile, compile_dir, check_morphism, recompose, check_coercion_laws |
| Migration | 4 | check_existence, lift, auto_migrate, integrate |
| Diff | 2 | diff, classify |
| Lens | 7 | generate, apply, verify, compose, inspect, check, lift |
| Data | 4 | convert, batch_migrate, data_status, data_sync |
| Parse | 3 | parse_file, parse_project, parse_emit |
| Expression | 6 | eval_expr, parse_expr, fmt_expr, check_expr, gat_eval, gat_check |
| VCS read | 10 | status, log, diff, blame, show, reflog, bisect, branch_list, tag_list, stash_list |
| VCS write | 15 | init, add, commit, checkout, branch_create/delete, tag_create/delete, merge, rebase, cherry_pick, reset, stash_push/pop, gc |
| Enrichment | 6 | add_default, add_coercion, add_merger, add_policy, list, remove |
| Git bridge | 2 | git_import, git_export |
| Audit | 1 | session_audit |

### 6 prompts

| Prompt | Purpose |
|--------|---------|
| `migration-plan` | Plan a migration between two schema versions |
| `schema-review` | Review a schema for best practices |
| `compatibility-report` | Analyze cross-protocol compatibility |
| `vcs-workflow` | Guide through init->add->commit->branch->merge |
| `cross-protocol-translation` | Translate data between two protocols |
| `code-schema-diff` | Parse two source files, diff schemas, generate lens |

### 3 resources

| URI | Content |
|-----|---------|
| `panproto://protocols` | 54 protocol definitions (incl. 19 annotation protocols) |
| `panproto://codecs` | 50+ I/O codecs (JSON, XML, Protobuf, Avro, and more) |
| `panproto://grammars` | 261 language parsers via tree-sitter |

See [mcp-server/README.md](mcp-server/README.md) for full documentation.

## Templates

Project scaffolds for getting started quickly:

- `templates/ts-project/` : TypeScript project with `@panproto/core ^0.71.0`
- `templates/python-project/` : Python project with `panproto>=0.71.0`
- `templates/rust-project/` : Rust project with `panproto-core 0.71.0` (edition 2024, rust-version 1.85)
- `templates/swift-project/` : Swift package depending on `panproto` 0.71.0 through the [`panproto-swift`](https://github.com/panproto/panproto-swift) mirror (Swift 6.1, macOS 14 and iOS 17)
- `templates/github-actions/` : CI workflow templates

## Learning path

If you are new to panproto, work through the skills in this order:

1. `/panproto-getting-started` to scaffold a project
2. `/panproto-define-schema` to learn schema construction
3. `/panproto-build-migration` to migrate between schema versions
4. `/panproto-use-lenses` for bidirectional transforms
5. `/panproto-schema-vcs` for version control
6. `/panproto-breaking-change-ci` to protect your schemas in CI

Each skill references chapters in the [panproto book](https://panproto.dev/book/) (Diataxis-organized: tutorials, how-to guides, reference, explanation). See [docs/tutorial-map.md](docs/tutorial-map.md) for the mapping.

## What changed in panproto 0.71.0

Two things in this release reshape what the toolkit tells you to do, so they are worth reading before following a plan written against an older version.

**The morphism search returns a span.** `find_span` answers with `src <- apex -> tgt`, whose apex is the sub-schema of the source induced on the vertices that found a target. It never refuses for want of a match: two schemas with nothing in common come back with an empty apex rather than a failure, which on real schema pairs is the common answer, since most admit no total morphism at all. `schema auto-migrate` reports the apex size, the coverage fraction, and the interval the search proved the quality lies in; `--total`, the default, and `--span` are three rungs of one strictness ladder over that one search. The span surface reaches every binding: `find_span` in Python, `Panproto.span` in TypeScript, `SchemaHandle.findSpan` in Swift, `pp_hom_find_span` on the C ABI.

**Any threshold calibrated before 0.71.0 needs re-reading.** Quality now comes out of the objective the search minimised rather than a separate scorer, and its Jaccard component's normaliser changed, so the same morphism can report a different number. `find_morphisms` returns the morphisms attaining the optimum rather than the whole hom-set, and its cap bounds every request. A search that could not be posed, or that spent its budget, is reported as such instead of arriving as "no morphism exists".

Alongside those: the overlap between two schemas is now the maximum common induced sub-schema, `RecursionPoint::mu_id` is gone, `SearchOptions::initial` is now `hard_pins`, and `SearchOptions::preferred`, `max_nodes`, `relax_edge_name_pruning`, and `DomainConstraints::name_similarity_threshold` are removed.

One standing limit worth stating beside them, unchanged by this release: the `schema` CLI resolves a single protocol, `atproto`. Every command taking `--protocol` exits with `unknown protocol` on any other name. All 54 built-ins are reachable through the SDKs, which read the same registry.

## Keeping up to date

This toolkit is written for a specific panproto version. When panproto releases a new version:

1. Check the [panproto CHANGELOG](https://github.com/panproto/panproto/blob/main/CHANGELOG.md) for API changes
2. Run `git pull` in your panproto-toolkit clone to get updates
3. The MCP server version tracks the toolkit version

To update:
```sh
cd ~/.local/share/panproto-toolkit && git pull
npm update -g @panproto/mcp-server
```

## License

MIT
