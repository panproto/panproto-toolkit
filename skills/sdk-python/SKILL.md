---
name: sdk-python
description: >
  Complete guide for using panproto via the Python SDK. Covers installation, native
  PyO3 bindings, schema building, migration, diff, lens, VCS, and I/O operations.
user-invocable: true
---

# Python SDK Guide

You are helping a user work with panproto's Python SDK. The SDK provides native PyO3 bindings (not WASM); Python objects directly own Rust data.

## Installation

```bash
pip install panproto
# or
uv add panproto
```

Requires Python 3.13+. Pre-built wheels are available for Linux (x86_64, aarch64), macOS (x86_64, ARM64), and Windows (x86_64).

## Quick start

```python
import panproto

# Load a built-in protocol
proto = panproto.get_builtin_protocol("atproto")

# Build a schema
builder = proto.schema()
builder.vertex("post", "record", "app.bsky.feed.post")
builder.vertex("post:body", "object")
builder.vertex("post:body.text", "string")
builder.edge("post", "post:body", "record-schema")
builder.edge("post:body", "post:body.text", "prop", "text")
builder.constraint("post:body.text", "maxLength", "3000")
schema = builder.build()
```

## Core operations

### Protocols

```python
# List all 50 built-in protocols
protocols = panproto.list_builtin_protocols()

# Load a specific protocol
proto = panproto.get_builtin_protocol("openapi")

# Define a custom protocol
proto = panproto.define_protocol(schema_theory, instance_theory)
```

### Schema building

```python
builder = proto.schema()
builder.vertex("user", "object")
builder.vertex("user.name", "string")
builder.vertex("user.age", "integer")
builder.edge("user", "user.name", "prop", "name")
builder.edge("user", "user.age", "prop", "age")
builder.constraint("user.name", "required", "true")
builder.constraint("user.name", "maxLength", "100")
schema = builder.build()
```

### Diffing and breaking change detection

```python
report = panproto.diff_and_classify(old_schema, new_schema, proto)

print(report.compatible)       # True or False
print(report.level)            # "compatible", "backward", or "breaking"
print(report.report_text())    # human-readable summary
print(report.report_json())    # machine-readable JSON
```

### Migrations

```python
# Check existence
report = panproto.check_existence(old_schema, new_schema, migration)
print(report.valid)
print(report.issues)

# Compile for fast application
compiled = panproto.compile_migration(old_schema, new_schema, migration)

# Lift a record
result = compiled.lift(record)
```

### Lenses

```python
# Auto-generate a lens
lens, quality = panproto.auto_generate_lens(old_schema, new_schema, proto)
print(quality)  # "isomorphism", "injection", "projection", "affine", or "general"

# Hint-guided auto-generation (0.26.0+)
chain = panproto.ProtolensChain.auto_generate_with_hints(
    old_schema, new_schema, proto,
    hints={"post": "article", "post:body": "article:content"}
)

# Or with a full HintSpec (JSON-encoded)
import json
hint_spec = json.dumps({
    "anchors": {"post": "article"},
    "constraints": [
        {"type": "scope", "under": "post:body", "targets": "article:content"},
        {"type": "exclude_targets", "vertices": ["article:legacy"]},
        {"type": "prefer", "predicate": {"kind": "similar_name", "threshold": 0.6}, "weight": 2.0}
    ]
})
chain = panproto.ProtolensChain.auto_generate_with_hint_spec(
    old_schema, new_schema, proto, hint_spec
)

# Get (forward projection)
view, complement = lens.get(instance)

# Put (backward restoration)
restored = lens.put(modified_view, complement)

```

### Instance I/O

```python
# Create an I/O registry
registry = panproto.IoRegistry()

# List available protocols
print(registry.list_protocols())  # 50+ codecs

# Parse data in a specific format
instance = registry.parse("atproto", json_bytes)

# Emit data in a different format
output = registry.emit("openapi", instance)
```

### Expressions

```python
# Parse an expression
expr = panproto.parse_expr("\\x -> x + 1")

# Evaluate with an instance context
result = panproto.eval_with_instance(expr, instance, schema)
```

### GAT operations (advanced)

```python
# Create a theory from a dict spec
theory = panproto.create_theory({
    "name": "MyTheory",
    "sorts": [...],
    "ops": [...],
    "eqs": [...],
})

# Or build incrementally (0.45.0+) with the fluent TheoryBuilder.
# Mirrors SchemaBuilder / MigrationBuilder.
theory = (
    panproto.TheoryBuilder("upt")
    .sort("pitch")
    .sort("interval")
    .op("transpose", ["pitch", "interval"], "pitch", input_names=["p", "i"])
    .op("zero", [], "interval")
    .eq("transpose_zero", "transpose(p, zero())", "p")
    .build()
)

# Compose theories via colimit
composed = panproto.colimit_theories(theory_a, theory_b, shared)

# Check a morphism
panproto.check_morphism(morphism, domain, codomain)

# Migrate a model
migrated = panproto.migrate_model(morphism, model)
```

#### Loading theories from text (0.44.0+)

The `panproto-theory-dsl` JSON / YAML / Nickel surface is reachable
from Python through classmethods on `Theory`. Accepted body variants
are `theory`, `class`, and `inductive`; multi-output variants
(`morphism`, `composition`, `protocol`, `bundle`, `instance`) raise
`GatError` and need the DSL crate directly.

```python
# String-based loaders
theory = panproto.Theory.from_json(json_text)
theory = panproto.Theory.from_yaml(yaml_text)
theory = panproto.Theory.from_nickel(ncl_text, import_paths=["./vendored"])

# Path-based dispatcher (auto-detects extension)
theory = panproto.Theory.from_path("theories/stlc.json")

# Flat-shape round-trip (panproto_gat::Theory serde shape)
emitted = theory.to_json()
recovered = panproto.Theory.from_dict_json(emitted)
```

The `TheoryBuilder` and the JSON / YAML / Nickel loaders all accept
the dependent-sort surface (`"Tm(arrow(a, b))"`) on the same footing
as the Rust `class!` macro — they share the
`panproto-theory-dsl::compile_theory::parse_term` term parser.

### Version control

```python
repo = panproto.VcsRepository.init("/path/to/project")
repo.add("schemas/post.json")
repo.commit("initial schema")
repo.branch("feature")
repo.checkout("feature")

# View history
for entry in repo.log():
    print(f"{entry.hash[:8]} {entry.message}")

# Merge
repo.checkout("main")
repo.merge("feature")
```

### Source code parsing

```python
# Parse a source file into a schema
registry = panproto.AstParserRegistry()
schema = registry.parse_source_file("src/main.ts")

# Parse a project directory
project = panproto.parse_project("./src")
```

#### Companion grammar packs (0.45.0+)

The published `panproto` wheel ships only the eleven `group-core`
grammars (Python, JavaScript, TypeScript, Java, C#, C++, PHP, Bash, C,
Go, Rust). The remaining ~250 grammars live in separately-installable
companion wheels, one pack per `panproto-grammars` group:

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

Install whichever group you need:

```bash
pip install panproto-grammars-functional
```

There is nothing to import from these packages. They register a
`panproto.grammars` setuptools entry point on installation;
`panproto.AstParserRegistry()` walks every such entry point and
threads the discovered grammar metadata into the native registry on
construction. The native class is reachable as
`panproto._native.AstParserRegistry()` for callers who want only the
`group-core` baseline (e.g. when reproducing a fixed-grammar build).

Cross-cdylib transport uses raw FFI pointers cast to integers; the
trust boundary lives in `panproto-py` with one `unsafe` block. A
single broken grammar (e.g. an upstream `node-types.json` with a
malformed entry) is skipped with a `RuntimeWarning` rather than
failing the whole construction.

### Git bridge

```python
result = panproto.git_import("/path/to/repo", "HEAD")
print(f"Imported {result.commit_count} commits")
```

## Data types

Python types map to Rust types:

| Python | Rust | Notes |
|--------|------|-------|
| `dict` | `HashMap<K,V>` | Converted via `pythonize` |
| `list` | `Vec<T>` | Converted via `pythonize` |
| `None` | `Option::None` | |
| `str` | `String` | |
| `int` | `i64` / `u64` | |
| `float` | `f64` | |
| `bool` | `bool` | |
| `bytes` | `Vec<u8>` | |

## Error handling

All errors raise `panproto.PanprotoError`:

```python
try:
    schema = builder.build()
except panproto.PanprotoError as e:
    print(e)  # human-readable error message
```

## Further Reading

- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html) (Python examples)
- [panproto Python API Reference](https://panproto.dev/python-docs/)
