# Changelog

## [0.12.1] - 2026-04-25

Updated for panproto v0.39.0 (lexicon-only release surfacing features that accumulated since 0.36: Merkle-tree per-file schema content addressing, the full 14-strategy alignment ladder, sample-based coercion-law verification with `FilterOptions`, and richer commit records).

### Changed
- `skills/coercion-law-checks`: corrected the `AutoLensConfig` example. `FilterOptions` has a single field, `unknown: UnknownSamplesPolicy`, with variants `Keep` (default, pre-0.38 behavior) and `Drop` (strictest filter). The earlier writeup invented `unknown_samples_policy: Reject` and a non-existent `unknown_witness_policy`. Added a section on the new `dev.panproto.translate.verifyCoercionLaws` procedure lexicon, which exposes the same checker to non-Rust toolchains.
- `skills/build-migration`: documented the 14-strategy alignment ladder (`user_hint`, `exact`, `exact_suffix`, `edge_label`, `alias`, `token_similarity`, `description_similarity`, `type_signature`, `wrap_unwrap`, `coerce`, `neighborhood`, `wl_refinement`, `structural`, `llm`) and the `alignmentStrategies` summary on the migration record. Cross-referenced `verifyCoercionLaws` for service-mediated callers.
- `skills/schema-vcs`: rewrote the core-concepts list to describe the `SchemaTreeObject` Merkle tree (`SingleLeaf` and `Directory`), `FileSchemaObject` with `cross_file_edges`, and `resolve_commit_schema`. Listed every commit-record field added through 0.39.0 (`protocolHash`, `theoryIds`, `dataHashes`, `complementHashes`, `editLogHashes`, `cstComplementHashes`, `timestamp`) and the new first-class object kinds (`fileSchema`, `schemaTree`, `flatSchema`, `dataSet`, `editLog`, `cstComplement`, `tag`).
- `agents/migration-advisor`: replaced the 6-strategy section with the 14-strategy ladder, tier gating, and the `alignmentStrategies` summary readout. Added the `FilterOptions::with_unknown(UnknownSamplesPolicy::Drop)` recommendation for the strictest coerce-anchor gate, plus the `verifyCoercionLaws` lexicon for non-Rust callers.
- `agents/vcs-assistant`: added a 0.38 / 0.39 notes section covering the per-file Merkle tree, the richer commit record, and the new content-addressed object kinds. Pointers to `panproto_vcs::resolve_commit_schema`, `dev.panproto.node.getFileSchema`, `dev.panproto.node.getSchemaTree`, `dev.panproto.node.listTheories`, `dev.panproto.node.listAlignments`.
- `agents/compatibility-checker`: added a 0.39 notes section recording that the 14-strategy ladder is now wire-canonical via `alignmentStrategies` and that `verifyCoercionLaws` is available for non-Rust callers.
- `mcp-server/src/tools/lens.ts`: `panproto_lens_generate` description names all 14 alignment strategies and the new `alignmentStrategies` summary field.
- `mcp-server/src/tools/migration.ts`: `panproto_auto_migrate` description names all 14 alignment strategies.
- `mcp-server/src/tools/vcs.ts`: `panproto_vcs_log` and `panproto_vcs_diff` descriptions reference the new commit-record fields and the per-file Merkle-tree resolution.

### Not yet wrapped
- No MCP tool wraps `dev.panproto.translate.verifyCoercionLaws` directly; callers wanting the procedure-style entry point should hit the lexicon endpoint on a panproto node, or use the existing `panproto_theory_check_coercion_laws` tool which wraps the CLI verb against a theory file.
- No MCP tool walks the `SchemaTreeObject` directly; `panproto_vcs_*` tools delegate to the CLI which resolves commits transparently. A dedicated `panproto_vcs_show_object` would be useful for object-level inspection.

## [0.12.0] - 2026-04-24

Updated for panproto v0.38.0 (sample-based coercion law verification; naturality-aware span exclusion in auto-lens).

### Added
- **skills/coercion-law-checks**: new skill covering the `schema theory check-coercion-laws` CLI verb, `CoercionClass` semantics (`Iso`, `Retraction`, `Projection`, `Opaque`), the `CoercionLawViolation` kinds (`Backward`, `Forward`, `NonDeterministic`, `MissingInverse`, `ForwardEvalError`, `InverseEvalError`, `UnknownClass`), sample-registry customization via `CoercionSampleRegistry::with_defaults`, DSL-side compile-time law checks via `compile_theory_with_law_check`, the opt-in `AutoLensConfig.coercion_law_registry` auto-lens filter, and a GitHub Actions workflow for CI integration.
- **mcp-server**: new `panproto_theory_check_coercion_laws` tool wrapping the 0.38.0 CLI verb; supports `--var-name` and `--json` flags.

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.38.0`; server version bumped to 0.12.0.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.38.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.38.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.38.0`.
- `skills/use-lenses`: cross-reference to the new coercion-law-checks skill, `AutoLensConfig.coercion_law_registry`, and naturality-aware span exclusion at `Lenient+`.
- `skills/protolenses`: new section on naturality-aware span exclusion; noted that empty-candidate failures on sparse-overlap pairs may now succeed on 0.38 without additional hints. Fixes panproto/panproto#51.
- `skills/build-migration`: new subsection on declaring `Iso` / `Retraction` honestly and running the law check before shipping a migration.
- `agents/migration-advisor`: recommend running `check-coercion-laws` before migration synthesis; note naturality-aware span exclusion reduces spurious empty-candidate failures.
- `agents/schema-reviewer`: recommend enabling `AutoLensConfig.coercion_law_registry` for schema reviews where coerce anchors appear.
- `agents/compatibility-checker`: coercion-law violations documented as a new class of check distinct from structural compatibility.

## [0.11.0] - 2026-04-23

Updated for panproto v0.37.0 (implicit arguments, closed sorts plus `Term::Case`, typed holes, let bindings, rewriting module with Knuth-Bendix and LPO, class / instance / inductive DSL bodies, theory imports, span-aware errors, six new alignment strategies, new `panproto-gat-macros` and `panproto-repl` crates).

### Added
- **skills/typeclasses**: classes and instances as theories and theory morphisms; DSL body types and the `class!`/`instance!`/`derive_theory!` proc-macros from `panproto-gat-macros`.
- **skills/rewriting**: directed equations, `check_local_confluence`, `check_termination_via_lpo`, `alpha_eq_modulo_rewrites`, and `typecheck_equation_modulo_rewrites`.
- **skills/implicit-arguments**: `Implicit::Yes` tag, Robinson unification recovery at call sites, `ParamSpec.implicit`, and guidance for when to mark a parameter implicit.
- **skills/closed-sorts-and-case**: `SortClosure::Closed(ops)`, `Term::Case`, coverage and branch-consistency checks, and the Stan-emitter-as-total-function example.
- **skills/repl**: quickstart for the `panproto-repl` binary with the full command reference.

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.37.0`; server version bumped to 0.11.0.
- `mcp-server`: `panproto_theory_validate` and `panproto_theory_compile` tool descriptions now mention the new class / instance / inductive body types and the implicit-argument, closed-sort, let-binding, and definitional-equality-modulo-rewrites features.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.37.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.37.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.37.0`.
- `skills/build-protocol`: new section documenting the 0.37.0 DSL body types (`class`, `instance`, `inductive`, `composition`, `protocol`), `TheorySpec.imports`, `ParamSpec.implicit`, and `SortSpec.closed`.
- `agents/migration-advisor`: new section on the six alignment strategies added in `panproto-mig` (`edge_label_anchors`, `suffix_anchors`, `description_anchors`, `neighborhood_anchors`, `wl_anchors`, `embedding_anchors`) and the `adjust_anchors_by_required_sets` post-processing tiebreak.
- `agents/compatibility-checker`: notes tightened `kinds_and_constraints_compatible` semantics (format-aware) and new alignment strategies.
- `agents/schema-reviewer`: notes morphism checks now honor alpha-renaming and preserve `SortClosure`, and recommends explicit `format` constraints for fields whose compatibility depends on them.

### Not yet wrapped
- No CLI verbs exist in `panproto-cli` for confluence, termination, or class / instance listing; consumers should call the library APIs (`panproto_gat::rewriting`) directly until those verbs land.

## [0.9.0] - 2026-04-20

Updated for panproto v0.35.0 (atproto `format`/`knownValues` fidelity in `parse_lexicon`; workspace-wide real-fixture examples and benches).

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.35.0`; server version bumped to 0.9.0.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.35.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.35.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.35.0`.

Downstream consumers using `@panproto/core` to parse AT Proto Lexicons now receive `format` (`datetime`, `did`, `at-uri`, `cid`, `nsid`, `handle`, `at-identifier`, `tid`, `record-key`, `language`, `uri`) and `knownValues` as structured constraints on the corresponding string vertex. Hand-written lexicon re-parsers that existed solely to recover these fields can be dropped. Resolves panproto/panproto#42.

## [0.8.0] - 2026-04-17

Updated for panproto v0.34.0 (git-remote-panproto rename, warm cache, autolens stringency tiers from v0.33.0).

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.34.0`; server version bumped to 0.8.0.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.34.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.34.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.34.0`.
- `skills/contributing`: supporting crate renamed from `git-remote-cospan` to `panproto-git-remote`. The old crate is yanked from crates.io; users should `cargo install panproto-git-remote` and use `panproto://` URLs going forward.

### Added
- `skills/use-lenses`: new sections covering the `Stringency` axis (`strict`/`balanced`/`lenient`/`exploratory`), the candidates API (`auto_generate_candidates` / `--top-n` / `--explain`), and sort-coercion witnesses with `CoerceProposal` outputs. Introduced in panproto v0.33.0.
- `mcp-server`: `panproto_lens_generate` tool gains `stringency`, `top_n`, and `explain` parameters matching the CLI flags.

## [0.7.1] - 2026-04-14

Updated for panproto v0.30.1 (WASM packaging fix; Node.js support for `@panproto/core`).

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.30.1`; server version bumped to 0.7.1.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.30.1`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.30.1`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.30.1`.

Users following the templates now pick up the fixed `@panproto/core` npm package
that actually includes the WASM binary. See panproto/panproto#33.

## [0.7.0] - 2026-04-13

Updated for panproto v0.29.0 (polymorphic query engine, git-remote-cospan distribution).

### Changed
- All version references updated to panproto 0.29.0
- MCP server version bumped to 0.7.0
- `@panproto/core` dependency updated to `^0.29.0`
- Template project dependencies updated to panproto 0.29.0

## [0.6.0] - 2026-04-06

Updated for panproto v0.27.0 (declarative theory definitions).

### Added
- **MCP server**: new `panproto_theory_validate`, `panproto_theory_compile`, `panproto_theory_compile_dir`, `panproto_theory_check_morphism`, `panproto_theory_recompose` tools wrapping `schema theory` CLI subcommands
- **skills/build-protocol**: new "Declarative theory definitions (0.27.0+)" section showing YAML and Nickel theory authoring, bundle format, and CLI usage

### Changed
- All version references updated to panproto 0.27.0
- MCP server version bumped to 0.6.0 (package) / 0.5.0 (McpServer)
- `@panproto/core` dependency updated to `^0.27.0`
- Template project dependencies updated to panproto 0.27.0
- **skills/sdk-rust**: crate version examples updated to 0.27

## [0.5.0] - 2026-04-02

Updated for panproto v0.26.0 (hint-guided auto-lens generation).

### Added
- **skills/use-lenses**: new "Hint-guided generation" section with `HintSpec` format, CLI `--hints` flag, and SDK examples
- **skills/lens-dsl**: new "HintSpec for guided auto-generation" section with JSON/Nickel examples, constraint types, and anchor propagation docs
- **MCP server**: `panproto_lens_generate` tool now supports `hints` parameter for guided auto-lens generation

### Changed
- All version references updated to panproto 0.26.0
- MCP server version bumped to 0.5.0
- `@panproto/core` dependency updated to `^0.26.0`
- **skills/sdk-rust**: added `auto_generate_with_hints()`, `HintParts`, `resolve_hints()`, `DomainConstraints`, `find_morphisms_constrained()`, `find_best_morphism_constrained()`
- **skills/sdk-python**: added `ProtolensChain.auto_generate_with_hints()` and `auto_generate_with_hint_spec()`
- **skills/sdk-typescript**: added hint-guided `protolensChainWithHints()` example
- **skills/protolenses**: added `--hints` CLI flag to automatic generation section
- **skills/build-migration**: replaced `--hint` string flag with `--hints <path>` JSON file approach

## [0.4.1] - 2026-04-02

Fix Rust API inaccuracies across skill files and update crate count.

### Fixed
- **skills/sdk-rust**: corrected function signatures for `auto_generate` (4 args), `colimit` (4 args), `check_morphism` (3 args), `typecheck_term` (3 args), `free_model` (2 args), `check_existence` (5 args), `lift_wtype` (arg order), `find_morphisms` (3 args), `parse_json` (3 args), `check_laws` (returns `Result`), `validate`/`normalize` (free functions), IO registry methods (`parse_wtype`/`emit_wtype`), VCS `init`/`commit` signatures, `report_text` (free function), error example variant, and `openapi` module path
- **skills/build-migration**: corrected `auto_generate` args and `lift_wtype` arg order
- **skills/build-protocol**: corrected `colimit` to `colimit_by_name` with correct 3-arg signature
- **skills/convert-data**: fixed invalid protocol paths and IO registry usage
- **skills/dependent-optics**: fixed `TheoryTransform` import path, `Sort` construction, `ValueKind::Float`
- **skills/field-transforms**: fixed two-step expr parsing, `ComputeField.target_key`, replaced nonexistent `CoerceType` with `ApplyExpr`
- **skills/protolenses**: corrected `auto_generate` args
- **skills/use-lenses**: corrected `auto_generate` args
- **skills/query-instances**: fixed two-step expr parsing, removed nonexistent `query` function
- **skills/contributing**: corrected crate count from 27 to 24, added missing `panproto-lens-dsl` to architecture diagram

## [0.4.0] - 2026-04-01

Updated for panproto v0.25.0 (declarative lens DSL with Nickel composition).

### Added
- **skills/lens-dsl**: new skill for writing declarative lens specifications in Nickel, JSON, or YAML using the `panproto-lens-dsl` crate (0.25.0+)

### Changed
- All version references updated to panproto 0.25.0
- MCP server version bumped to 0.4.0
- `@panproto/core` dependency updated to `^0.25.0`
- **skills/use-lenses**: added section on declarative lens files with Nickel example
- **skills/protolenses**: added section on declarative protolens specifications
- **agents/migration-advisor**: now recommends declarative lens files for version-controlled combinator chains

## [0.3.0] - 2026-04-01

Updated for panproto v0.24.0 (unified tree-sitter parsing, dependent optics).

### Added
- **skills/dependent-optics**: new skill for dependent optics, scoped transforms, and combinators (0.23.0+)
- **skills/format-preserving**: new skill for format-preserving parsing via UnifiedCodec and CstComplement (0.24.0+)
- **MCP server**: `panproto_lens_pipeline` tool for building combinator pipelines with scoped transforms
- **MCP server**: `panproto_parse_preserving` tool for format-preserving parsing with CST complement
- **MCP server**: `panproto_emit_preserving` tool for format-preserving emission from CST complement

### Changed
- All version references updated to panproto 0.24.0
- MCP server version bumped to 0.3.0
- `@panproto/core` dependency updated to `^0.24.0`
- Rust template updated with `tree-sitter` feature option
- **agents/data-converter**: now recommends format-preserving conversion when available
- **agents/migration-advisor**: now recommends dependent optics for array element transforms and `RenameEdgeName` for property key renames
- **resources/codecs**: documents UnifiedCodec and legacy codec deprecation

## [0.2.0] - 2026-03-31

Updated for panproto v0.23.0 (dependent optics, lens combinators, WASM/TS/Python pipeline APIs).

## [0.1.0] - 2026-03-31

Initial release of panproto-toolkit, written for panproto v0.22.1.

### Skills (21)
- **getting-started**: scaffold a new panproto project (TypeScript, Python, or Rust)
- **define-schema**: define schemas with protocol-specific guidance
- **build-migration**: build migrations with existence checking and compilation
- **use-lenses**: bidirectional lenses with get/put, complements, and auto-generation
- **protolenses**: schema-parameterized lens families and chains
- **breaking-change-ci**: breaking change detection and CI gates
- **convert-data**: convert data between any of 50 protocols
- **cross-protocol**: cross-protocol translation with loss analysis
- **schema-vcs**: schema version control with pushout-based merge
- **query-instances**: query instances with predicates and projections
- **expression-language**: reference for the ~50-builtin expression language
- **build-protocol**: define custom protocols by composing building-block theories
- **field-transforms**: value-dependent transforms during migration
- **full-ast-parsing**: parse 248 languages via tree-sitter
- **sdk-typescript**: complete @panproto/core TypeScript SDK guide
- **sdk-python**: complete panproto Python SDK guide
- **sdk-rust**: complete panproto-core Rust library guide
- **contributing**: contributor onramp
- **ci-github-actions**: GitHub Actions workflow generator
- **ci-pre-commit**: pre-commit hook setup
- **ci-breaking-gate**: PR gate for breaking schema changes

### Agents (5)
- **migration-advisor** (Opus): migration strategy analysis
- **compatibility-checker** (Sonnet): cross-protocol compatibility
- **data-converter** (Sonnet): format conversion with fidelity reporting
- **schema-reviewer** (Opus): schema quality review
- **vcs-assistant** (Sonnet): VCS workflow guidance

### MCP Server
- 18 tools across schema, migration, diff, lens, convert, parse, expr, and VCS
- 3 resources: protocols, codecs, grammars catalogs
- 3 prompt templates: migration-plan, schema-review, compatibility-report
- Published as `@panproto/mcp-server` on npm

### Templates
- TypeScript, Python, and Rust project scaffolds
- GitHub Actions workflow templates (schema-check, breaking-change-gate, data-migration)

### Documentation
- Installation guide, skills guide, agents guide, MCP server guide
- Tutorial chapter mapping for all skills
- 4 worked examples (ATProto migration, SQL-to-GraphQL, CI pipeline, lens round-trip)
