# Changelog

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
