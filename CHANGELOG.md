# Changelog

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
