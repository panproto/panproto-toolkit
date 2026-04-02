---
name: contributing
description: >
  Guide for contributing to panproto. Covers repository setup, building, testing,
  the 27-crate architecture, PR workflow, and how to find good first issues.
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
cd sdk/typescript && pnpm install && pnpm build

# Build Python SDK
maturin develop --manifest-path crates/panproto-py/Cargo.toml
```

## Architecture

panproto has 24 crates organized in a dependency hierarchy:

```
Level 0 (foundation):   panproto-gat
Level 1 (representation): panproto-expr, panproto-expr-parser, panproto-schema
Level 2 (operations):    panproto-inst, panproto-mig, panproto-lens, panproto-lens-dsl, panproto-check
Level 3 (application):   panproto-protocols, panproto-io, panproto-vcs, panproto-parse
Level 4 (integration):   panproto-project, panproto-git, panproto-llvm, panproto-jit
Level 5 (bindings):      panproto-core, panproto-wasm, panproto-py, panproto-cli
Supporting:              panproto-grammars, panproto-xrpc, git-remote-cospan
```

The key architectural principle: Level 0 (GAT engine) is the only hardcoded Rust. Everything above is data interpreted by the engine. Protocols are pairs of GATs. Schemas are models of schema theory GATs. Instances are models of schemas.

## CI checks

Before submitting a PR, run the full CI suite locally:

```bash
# Formatting
cargo fmt --all -- --check

# Clippy (strict)
RUSTFLAGS="-D warnings" cargo clippy --workspace --all-targets

# Tests
cargo nextest run --workspace

# Documentation
RUSTDOCFLAGS="-D warnings" cargo doc --workspace --no-deps
```

All four must pass. The CI runs these exact commands.

## Internal developer skills

Once you have the repo cloned, panproto includes 25 internal Claude Code skills in `.claude/skills/` and 4 agents in `.claude/agents/`. These are for working ON panproto:

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

Reference skills (auto-invoked when editing relevant files):
- `gat-theory` : GAT implementation mapping
- `rust-conventions` : Rust patterns and conventions
- `wasm-boundary` : WASM boundary patterns
- `ts-sdk` : TypeScript SDK conventions

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
| `grammars.toml` | Tree-sitter grammar registry |
| `.github/workflows/ci.yml` | CI pipeline definition |
| `notes/THEORY.md` | Mathematical foundations |
| `notes/ENGINEERING.md` | Engineering specifications |

## Further Reading

- [Dev Guide Ch. 1: Welcome](https://panproto.dev/dev-guide/chapters/01-welcome.html)
- [Dev Guide Ch. 2: First Contribution](https://panproto.dev/dev-guide/chapters/02-first-contribution.html)
- [Dev Guide Ch. 3: Building & Testing](https://panproto.dev/dev-guide/chapters/03-building-testing.html)
- [Dev Guide Ch. 5: Architecture Overview](https://panproto.dev/dev-guide/chapters/05-architecture-overview.html)
