---
name: contributing
description: >
  Guide for contributing to panproto. Covers repository setup, building, testing,
  the crate architecture, the four language bindings, PR workflow, and how to find
  good first issues.
---

# Contributing to panproto

You are helping someone contribute to the panproto project.

## Prerequisites

- Rust stable (1.85+ MSRV, latest stable recommended)
- wasm-pack (for WASM builds)
- Node.js 22+ and pnpm (for TypeScript SDK)
- Python 3.13+ and maturin (for Python SDK)

## Clone and build

```bash
git clone https://github.com/panproto/panproto.git
cd panproto

# Build all Rust crates
cargo build --workspace

# Run all tests
cargo nextest run --workspace

# Build WASM
wasm-pack build crates/panproto-wasm --target web --dev

# Build TypeScript SDK
cd bindings/typescript && pnpm install && pnpm build

# Build Python SDK
cd bindings/python && maturin develop
```

The four bindings live under `bindings/`: `typescript`, `python`, `haskell`,
and `swift`. Each has its own bootstrap and its own CI job. Haskell and Swift
consume `crates/panproto-c`, so they can only reach the C ABI; Python is a PyO3
extension linking `panproto-core` directly and so reaches further.

## Architecture

The workspace holds 36 `panproto-*` crates, organized in a dependency hierarchy:

```
Level 0 (foundation):   panproto-gat, panproto-gat-macros
Level 1 (representation): panproto-expr, panproto-expr-parser, panproto-schema
Level 2 (operations):    panproto-inst, panproto-mig, panproto-lens, panproto-check
Level 3 (DSLs):          panproto-dsl-eval, panproto-lens-dsl, panproto-theory-dsl
Level 4 (application):   panproto-protocols, panproto-io, panproto-vcs, panproto-parse
Level 5 (integration):   panproto-project, panproto-git, panproto-git-remote, panproto-xrpc
Level 6 (bindings):      panproto-core, panproto-wasm, panproto-c, panproto-py, panproto-cli
Grammars:                panproto-grammars, plus ten per-group companion crates
```

`panproto-c` is the C ABI the Haskell and Swift bindings link against; its
`CONTRACT.md` is the signature reference, and three CI gates keep the header,
the shims, and their tests in step with it.

The key architectural principle: Level 0 (GAT engine) is the only hardcoded Rust. Everything above is data interpreted by the engine. Protocols are pairs of GATs. Schemas are models of schema theory GATs. Instances are models of schemas.

## CI checks

Before submitting a PR, run the full CI suite locally:

```bash
# Formatting
cargo fmt --all -- --check

# Clippy (strict), plus the fuzz targets, which are their own workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo check --manifest-path fuzz/Cargo.toml

# Tests. The `ci` profile skips the two multi-minute full-corpus emit gates,
# which run in the scheduled corpus-gate workflow (and locally by default).
cargo nextest run --workspace --profile ci
cargo test --doc --workspace

# Documentation
RUSTDOCFLAGS="-D warnings" cargo doc --workspace --no-deps

# Version consistency across every version-declaring file
python3 .github/scripts/check_version_consistency.py --verbose
```

CI runs these exact commands, with `RUSTFLAGS: -D warnings` set for the whole
workflow. The test job runs the matrix on both stable and the 1.85.0 MSRV.

## Internal developer skills

Once you have the repo cloned, panproto includes 27 internal Claude Code skills in `.claude/skills/` and 4 agents (`breaking-change`, `profile`, `review`, `wasm-audit`) in `.claude/agents/`. These are for working ON panproto:

| Skill | Purpose |
|-------|---------|
| `/impl-crate <name>` | Scaffold and implement a specific crate |
| `/impl-protocol <name>` | Implement a protocol definition |
| `/impl-lens` | Implement lens combinators |
| `/impl-migration` | Implement migration engine features |
| `/test [scope]` | Run tests (all, crate, integration, property) |
| `/bench [crate]` | Run benchmarks |
| `/lint` | Run all linting checks |
| `/build-wasm` | Build WASM module |
| `/build-ts` | Build TypeScript SDK |
| `/release <version>` | Perform a release |
| `/semver` | Check for breaking API changes |
| `/coverage` | Generate coverage reports |
| `/fuzz <target>` | Run fuzz tests |
| `/deps` | Audit dependencies with cargo-deny |
| `/hakari` | Manage the workspace-hack crate |
| `/arch-doc` | Create or update architecture documentation |
| `/ts-docs` | Generate TypeScript API documentation |
| `/rustdoc` | Generate and review Rust documentation |
| `/wasm-size` | Analyze WASM binary size |
| `/ci` | Create or modify GitHub Actions workflows |
| `/lean-transpile` | Transpile Rust to Lean 4 through the protolens pipeline |

Reference skills (auto-invoked when editing relevant files):
- `gat-theory` : GAT implementation mapping
- `rust-conventions` : Rust patterns and conventions
- `wasm-boundary` : WASM boundary patterns
- `ts-sdk` : TypeScript SDK conventions
- `panproto-book` : editorial conventions for `book/src/`
- `asw-prose-style` : voice rules for long-form prose

## Finding good first issues

Look for issues labeled `good first issue` on GitHub. Common contribution areas:

1. **New protocol definitions**: add support for a new schema format in `panproto-protocols`
2. **I/O codec improvements**: improve parsing/emitting for specific formats in `panproto-io`
3. **CLI enhancements**: add new subcommands or improve output in `panproto-cli`
4. **Documentation**: improve doc comments, add examples
5. **Test coverage**: add property tests for mathematical invariants

## PR workflow

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run the full CI suite locally (see above)
5. Submit a PR with a clear description
6. Address review feedback

## Key files to know

| File | Purpose |
|------|---------|
| `Cargo.toml` | Workspace configuration, shared dependencies |
| `deny.toml` | Dependency audit rules |
| `cliff.toml` | Changelog generation |
| `grammars.toml` | Tree-sitter grammar registry (261 grammars) |
| `grammar-packs.toml` | Companion grammar wheel definitions |
| `crates/panproto-c/CONTRACT.md` | C ABI signature reference (122 entry points) |
| `.github/workflows/ci.yml` | CI pipeline definition |
| `.github/scripts/check_version_consistency.py` | Version-field gate, with a `--self-test` flag |
| `notes/THEORY.md` | Mathematical foundations |
| `notes/ENGINEERING.md` | Engineering specifications |

## Further Reading

- [Architecture](https://panproto.dev/book/explanation/architecture.html)
- [Crate map](https://panproto.dev/book/reference/crate-map.html)
- [What panproto verifies](https://panproto.dev/book/explanation/what-is-verified.html)
- `book/CONTRIBUTING.md`: the editorial conventions every book page passes, including the per-chapter review ritual and the Rust-block compile gate.
