---
name: companion-grammar-packs
description: >
  spaCy-style companion grammar packs for the panproto Python wheel. Pip-installable
  packs that contribute tree-sitter grammars to panproto.AstParserRegistry without
  bloating the core wheel. Covers install, the entry-point discovery mechanism,
  cross-cdylib transport, and the full set of ten packs.
user-invocable: true
---

# Companion grammar packs (panproto 0.45.0+)

You are helping a user reach tree-sitter grammars that don't ship in the core `panproto` wheel.

## Why packs

The published `panproto` wheel bundles only the eleven `group-core` grammars (Python, JavaScript, TypeScript, Java, C#, C++, PHP, Bash, C, Go, Rust). `panproto-grammars` itself can compile ~250 grammars, but a wheel with all of them runs roughly 300 MB unstripped — past PyPI's per-file ceiling.

The companion-pack architecture (0.45.0) splits the surface: the core wheel stays small, and each `panproto-grammars` group ships as its own pip-installable wheel. Installing a pack adds its grammars to `panproto.AstParserRegistry()` automatically, with no further configuration.

## The packs

| Wheel | Languages |
|-------|-----------|
| `panproto-grammars-web` | HTML, CSS, JavaScript, TypeScript, TSX, JSON, Vue, Svelte, Astro, GraphQL |
| `panproto-grammars-systems` | C, C++, Rust, Go, Zig, D, Nim, Odin, V, Hare |
| `panproto-grammars-jvm` | Java, Kotlin, Scala, Groovy, Clojure |
| `panproto-grammars-scripting` | Python, Ruby, Lua, Bash, Perl, R, Julia, Nushell, Fish |
| `panproto-grammars-data` | JSON, TOML, XML, YAML, SQL, CSV, GraphQL, Protobuf |
| `panproto-grammars-functional` | Haskell, OCaml, Elm, Gleam, Erlang, Elixir, PureScript, F#, Clojure, Scheme, Racket |
| `panproto-grammars-devops` | Dockerfile, Terraform, HCL, Nix, Bash, YAML, TOML, Make, CMake |
| `panproto-grammars-mobile` | Swift, Kotlin, Dart, Java, Objective-C |
| `panproto-grammars-music` | SuperCollider, LilyPond, ABC, Csound, ChucK, Glicol, Tidal mini-notation, Strudel mini-notation |
| `panproto-grammars-all` | every grammar in `panproto-grammars` |

`panproto-grammars-music` is the only pack whose authored grammars (Tidal mini-notation, Strudel mini-notation) live in panproto itself rather than in upstream `tree-sitter-<lang>` repos. The rest vendor existing upstream grammars via `tools/fetch-grammars.py`.

## Installation

```bash
pip install panproto-grammars-functional
```

Pulls `panproto>=0.45,<0.46` as a runtime dep automatically. Python 3.13+. Wheels are published for Linux x86_64 / aarch64, macOS arm64 / x86_64, and Windows x86_64.

`panproto-grammars-all` × `aarch64-unknown-linux-gnu` is currently missing — see [issue #85](https://github.com/panproto/panproto/issues/85). aarch64-linux users can install the per-group packs explicitly or pick what they need:

```bash
pip install panproto-grammars-{functional,web,systems,jvm,scripting,data,devops,mobile,music}
```

## Use

There is nothing to import from the pack. Construction of `AstParserRegistry` discovers any installed pack and threads its grammars in:

```python
import panproto

reg = panproto.AstParserRegistry()
schema = reg.parse_with_protocol("haskell", b"f x = x", "main.hs")
```

The native class `panproto._native.AstParserRegistry()` is reachable for callers who want only the `group-core` baseline (e.g. when reproducing a fixed-grammar build for testing).

## Architecture

Each pack is a separate pyo3 cdylib depending on `panproto-grammars` with one `group-*` feature flag. The cdylib bakes the grammar bytes into static `.rodata` and exposes `grammars_metadata()` returning a list of dicts: `name`, `extensions`, `language_ptr`, `node_types_ptr/len`, optional `tags_query_ptr/len`, optional `grammar_json_ptr/len`. The `*_ptr` values are raw FFI pointers cast to integers.

`panproto.AstParserRegistry()` is now a Python factory in `panproto/__init__.py` that walks `importlib.metadata.entry_points(group="panproto.grammars")` and threads the metadata into the native registry's `extra_grammars` constructor parameter. Cross-cdylib transport relies on three invariants:

1. `tree_sitter::Language` is a tuple struct over a single `*const TSLanguage` field, so a `transmute<Language, usize>` round-trips on every supported platform. Each companion crate has a compile-time `assert!(size_of::<tree_sitter::Language>() == size_of::<usize>())` guarding the assumption.
2. The companion's grammar bytes live in its cdylib's `.rodata` and remain valid for the process lifetime. `panproto-py`'s decoding helper widens the integer pointers to `&'static` slices on that basis, gated by a single `#[allow(unsafe_code)]` block.
3. A process-wide cache deduplicates the leaked metadata across repeat `AstParserRegistry()` constructions, and `ParserRegistry::has_parser` short-circuits re-registration of grammars already in the registry (relevant when the umbrella `all` pack overlaps every per-group pack).

The pyo3 cdylib uses `#[pymodule(name = "_impl")]` so the leaf module name (`_impl`) is distinct from `panproto._native`'s. Without this, multiple cdylibs in the same Python process would export `PyInit__native` and the dynamic linker would conflate them.

## Failure modes

A single broken grammar (e.g. an upstream `node-types.json` with a malformed entry) is skipped with a Python `RuntimeWarning` rather than failing the whole construction. The built-in `ParserRegistry::new()` already handles per-grammar failures the same way; companions inherit the resilience.

A broken companion (entry point points at a missing module, `grammars_metadata()` raises) skips with a warning at the wrapper level. Other companions still register; the core panproto registry construction succeeds.

## Versioning

The pack version tracks the workspace `panproto` version on every release. Consumers should pin both to the same minor:

```toml
[project]
dependencies = [
    "panproto>=0.45,<0.46",
    "panproto-grammars-functional>=0.45,<0.46",
]
```

`check_version_consistency.py` in panproto's repo validates this pin shape across every companion `pyproject.toml` against the workspace version.

## See also

- `sdk-python` skill — `AstParserRegistry`, `parse_with_protocol`, `parse_project`.
- `full-ast-parsing` skill — what AST parsing produces and how to consume it.
- panproto-grammars README in the panproto repo — the underlying group / language flag table.
