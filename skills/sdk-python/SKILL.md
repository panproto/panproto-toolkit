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

## Homomorphism search and cascade (0.50.0+)

Discover theory morphisms and induce schema/data migrations programmatically:

```python
from panproto import find_morphisms, find_best_morphism, induce_schema_morphism, induce_migration_from_theory

# Find all morphisms between two schemas (CSP + backtracking search)
morphisms = find_morphisms(source_schema, target_schema, monic=True)

# Get the single best morphism (highest quality score)
best = find_best_morphism(source_schema, target_schema)
print(best.quality)      # 0.0–1.0 confidence
print(best.vertex_map)   # source vertex → target vertex mapping

# Induce a schema morphism from a theory morphism
schema_morph = induce_schema_morphism(theory_morph, source_schema)

# Compile the morphism directly to a migration
migration = induce_migration_from_theory(theory_morph, source_schema, target_schema)
```

Classes: `TheoryMorphism` (from theory-level morphism discovery), `SchemaMorphism` (induced from theory morphism), `FoundMorphism` (from schema-level hom search, with `vertex_map` and `quality`).

## Fluent theory construction (0.44.0+)

```python
builder = panproto.TheoryBuilder("MyTheory")
builder.sort("Vertex")
builder.sort("Edge")
builder.op("src", inputs=["Edge"], output="Vertex")
builder.op("tgt", inputs=["Edge"], output="Vertex")
theory = builder.build()
```

## Theory loaders (0.44.0+)

```python
theory = panproto.Theory.from_json(json_string)
theory = panproto.Theory.from_yaml(yaml_string)
theory = panproto.Theory.from_nickel(nickel_string)
theory = panproto.Theory.from_path("theory.ncl")       # auto-dispatch on extension
theory = panproto.Theory.from_dict_json(json_string)    # from flat serialized JSON (not a DSL document)
theory = panproto.Theory.from_dict_yaml(yaml_string)    # from flat serialized YAML (not a DSL document)

json_str = theory.to_json()
yaml_str = theory.to_yaml()
```

## ProtolensChain DSL (0.44.0+)

Load lens specifications from Nickel, JSON, or YAML DSL documents:

```python
chain = panproto.ProtolensChain.from_dsl_json(json_string, body_vertex="steps")
chain = panproto.ProtolensChain.from_dsl_yaml(yaml_string, body_vertex="steps")
chain = panproto.ProtolensChain.from_dsl_nickel(nickel_string, body_vertex="steps")
chain = panproto.ProtolensChain.from_dsl_path("migration.ncl", body_vertex="steps")

# Instantiate against a concrete schema
lens = chain.instantiate(schema, protocol)

# Compose two chains
composed = chain.compose(other_chain)

# Serialize
chain.to_json()
panproto.ProtolensChain.from_json(json_string)
```

## Lens combinators (0.50.0+)

```python
from panproto import rename_field, remove_field, add_field, hoist_field, pipeline, auto_generate_lens_candidates

# Individual combinators
step1 = rename_field("User", "name", "old_name", "new_name")   # parent, field, old, new
step2 = remove_field("deprecated_field")                         # field name
step3 = add_field("User", "new_field", "string")                # parent, name, kind
step4 = hoist_field("User", "address", "city")                  # parent, intermediate, child

# Compose into a pipeline
chain = pipeline([step1, step2, step3, step4])

# Ranked candidates
candidates = auto_generate_lens_candidates(old_schema, new_schema, protocol, top_n=5, stringency="balanced")
for c in candidates:
    print(c.quality)
```

## Runtime grammar override (0.47.0+)

```python
registry = panproto.AstParserRegistry()
registry.override_grammar("my-lang", ["myext"], language_ptr, node_types_json)
```

## Anonymous token field text (0.47.0+)

```python
text = schema.field_text(vertex_id, "operator")  # returns str or None
```

## ATProto lexicon parsing (0.53.0+)

Turn an ATProto lexicon document (a dict or a JSON string) into a `Schema` under the builtin `atproto` protocol. Reference properties record a `ref` provenance constraint, so real `app.bsky.*` lexicons validate against the builtin protocol.

```python
schema = panproto.parse_atproto_lexicon(lexicon_doc)          # dict or JSON str
schema = panproto.parse_schema_document("atproto", lexicon_doc)  # protocol-dispatching
schema = panproto.Schema.from_atproto_lexicon(lexicon_doc)    # classmethod form
```

Parse a bundle of documents together (0.59.0+) so that references across documents resolve to real, typed vertices instead of opaque `"ref"` placeholders. Every document's definitions are registered before any document's structure is parsed; a ref whose target is in no document of the bundle stays a placeholder, marking it genuinely external. Single-document parsing is the one-document case of it, unchanged.

```python
schema = panproto.parse_schema_bundle("atproto", [referring_doc, referenced_doc])
```

## Schema to theory extraction (0.53.0+)

Extract the generalized algebraic theory a schema instantiates: one sort per vertex, one unary operation per edge, with primitive value kinds preserved on value-kind vertices (via the `SortKind::Val` vocabulary). Refined scalars, per-field defaults, and reference-versus-containment ride the `Schema` constraint layer and `Edge.kind`, not the theory.

```python
theory = panproto.theory_of(schema)
theory = schema.theory(name=None)   # method form; name defaults to the protocol
```

## Committed data access (0.54.0+)

Record and read back committed data sets through the VCS without dropping to Rust. `data_at` resolves a branch, tag, or commit-id prefix and returns the data committed at that revision, never moving `HEAD`, the index, or the working tree (the data counterpart to reading a committed schema; contrast `checkout_with_data`, which moves `HEAD` and migrates files in place).

```python
repo.add_data(path)                       # record a data set into the VCS
sets = repo.data_at("main")               # branch / tag / commit-id prefix
for d in sets:                            # one dict per data set
    print(d["schema_id"], d["record_count"], d["data"])
```

## SDK surface summary

The Python SDK exposes 32 classes and 37 module-level functions across 16 modules: schema, protocols, mig, hom, check, inst, io, lens, gat, expr, vcs, parse, project, git, convert, error. (0.53.0 added `parse_atproto_lexicon`, `parse_schema_document`, and `theory_of`; 0.54.0 added `Repository.data_at` / `Repository.add_data`; 0.59.0 added `parse_schema_bundle` for cross-document reference resolution.)

## Further Reading

- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html) (Python examples)
- [panproto Python API Reference](https://panproto.dev/python-docs/)
