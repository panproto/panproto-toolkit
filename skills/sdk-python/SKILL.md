---
name: sdk-python
description: >
  Complete guide for using panproto via the Python SDK. Covers installation, native
  PyO3 bindings, schema building, migration, diff, lens, the span search, VCS, and
  I/O operations.
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
# List all 54 built-in protocols
protocols = panproto.list_builtin_protocols()

# Load a specific protocol
proto = panproto.get_builtin_protocol("openapi")

# Define a custom protocol from a spec dict
proto = panproto.define_protocol({
    "name": "my_protocol",
    "schema_theory": "ThMySchema",
    "instance_theory": "ThWType",
    "obj_kinds": ["object", "string", "integer"],
    "constraint_sorts": ["required", "maxLength"],
    "edge_rules": [],
})

# Or from theories you already hold
proto = panproto.Protocol.from_theories("my_protocol", schema_theory, instance_theory, ["object"])
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
print(report.classification)   # "compatible", "backward", or "breaking"
print(report.breaking_changes)
print(report.report_text())    # human-readable summary
print(report.report_json())    # machine-readable JSON

# Or diff first and classify separately
diff = panproto.diff_schemas(old_schema, new_schema)
report = diff.classify(proto)
```

`SchemaDiff` carries `classify` and `to_dict` and nothing else. The stub used to
declare `added_vertices` and `removed_vertices`, which always raised
`AttributeError`; both are gone, and `classify` is declared where it was
missing.

### Migrations

```python
# Check existence (migration first, then protocol, then the two schemas;
# returns a dict, not an object)
report = panproto.check_existence(migration, proto, old_schema, new_schema)
print(report["valid"])
print(report["errors"])

# Compile for fast application (migration first, then the two schemas)
compiled = panproto.compile_migration(migration, old_schema, new_schema)

# Lift an instance
result = compiled.lift(instance)

# Or run it as a lens
view, complement = compiled.get(instance)
restored = compiled.put(view, complement)
compiled.check_laws(instance)
lens = compiled.to_lens()
```

`CompiledMigration.get` returns a `Complement` object, whose
`dropped_node_count` and `dropped_arc_count` carry the two numbers a dict used
to. Reading `complement["dropped_node_count"]` no longer works.

### Lenses

```python
# Auto-generate a lens. Three values come back: the lens, its quality in
# [0, 1], and the sort-coercion proposals the search surfaced.
lens, quality, coerce_proposals = panproto.auto_generate_lens(old_schema, new_schema, proto)
print(quality)  # a float, not a classification string

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

# Instantiate a chain against a concrete schema
lens = chain.instantiate(old_schema, proto)

# Get (forward projection)
view, complement = lens.get(instance)

# Put (backward restoration)
restored = lens.put(modified_view, complement)

# Verify the round-trip laws (raises LensError on violation)
lens.check_laws(instance)
```

The `similar_name` preference in a hint spec no longer cuts the search. Its
`threshold` reaches the objective as the weight on the name component, so a
candidate scoring below it is still searched and merely scored lower; a caller
wanting a hard restriction states a `scope` or an `exclude_targets` constraint.

### Instance I/O

```python
# Create an I/O registry
registry = panproto.IoRegistry()

# List available protocols
print(registry.list_protocols())

# Parse data in a specific format (protocol, schema, bytes)
instance = registry.parse("atproto", schema, json_bytes)

# Emit data in a different format (protocol, schema, instance)
output = registry.emit("openapi", schema, instance)
```

Both `parse` and `emit` take the schema, because a codec reads the instance
against the schema it belongs to.

### Expressions

```python
# Parse an expression
expr = panproto.parse_expr("\\x -> x + 1")

# Evaluate it
result = expr.eval()

# Render it back to surface syntax
print(expr.pretty())
print(panproto.pretty_print_expr(expr))
```

Instance-aware evaluation, where the graph-traversal builtins (`edge`,
`children`, `has_edge`, `edge_count`, `anchor`) resolve, is not exposed as a
Python entry point. It runs inside field transforms and the query engine, both
of which the Rust and TypeScript surfaces reach directly.

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
as the Rust `class!` macro; they share the
`panproto-theory-dsl::compile_theory::parse_term` term parser.

### Version control

```python
repo = panproto.Repository.init("/path/to/project")

# `add` takes the Schema itself, not a path, and `commit` takes an author.
repo.add(schema)
head = repo.commit("initial schema", "you@example.com")

repo.create_and_checkout_branch("feature")
repo.add(revised_schema)
repo.commit("rename displayName", "you@example.com")

# View history (a list of dicts)
for entry in repo.log(20):
    print(entry["message"])

# Merge
repo.checkout_branch("main")
result = repo.merge("feature", "you@example.com")
```

`Repository` is the full porcelain: `open`, `add_with_options` (via
`repo.add(schema, skip_verify=True)`), `add_project`, `add_data`, `amend`,
`reset`, `schema_at`, `data_at`, branch and tag verbs, `merge`, `rebase`,
`cherry_pick`, `stash_*`, `bisect_start`, `blame_*`, and `gc`.
`VcsRepository` is a different, much smaller class (an in-memory store with
`add` and `list_refs`) and is not a `Repository` subclass.

### Source code parsing

```python
# Parse a source file into a schema (the registry reads path + bytes)
registry = panproto.AstParserRegistry()
schema = registry.parse_file("src/main.ts", open("src/main.ts", "rb").read())

# Or without a registry
schema = panproto.parse_source_file("src/main.ts", open("src/main.ts", "rb").read())

# Emit it back
source = registry.emit("typescript", schema)
pretty = registry.emit_pretty("typescript", schema)

# Parse a project directory
project = panproto.parse_project("./src")
print(project.file_paths())
```

#### Companion grammar packs (0.45.0+)

The published `panproto` wheel ships only the eleven `group-core`
grammars (Python, JavaScript, TypeScript, Java, C#, C++, PHP, Bash, C,
Go, Rust). The remaining 250 of the 261 vendored grammars live in
separately-installable companion wheels, one pack per `panproto-grammars`
group:

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
from panproto import (
    find_span, find_morphisms, find_best_morphism,
    induce_schema_morphism, induce_migration_from_theory,
)

# The optimal total morphisms: every element attains the optimum, so they all
# carry the same quality and there is no worse tier further down the list.
morphisms = find_morphisms(source_schema, target_schema, monic=True)

# The single best one, or None when no total morphism exists
best = find_best_morphism(source_schema, target_schema)
print(best.quality)      # 0.0–1.0
print(best.vertex_map)   # source vertex → target vertex
print(best.edge_map)     # list[tuple[Edge, Edge]], readable since 0.71.0

# Induce a schema morphism from a theory morphism
schema_morph = induce_schema_morphism(theory_morph, source_schema)

# Compile the morphism directly to a migration
schema_morph, compiled = induce_migration_from_theory(
    theory_morph, source_schema, target_schema
)
```

### The span, when no total morphism exists (0.71.0+)

`find_best_morphism` answers `None` for most real schema pairs, because a
target that dropped a field admits no total morphism at all. `find_span` is
the call that answers with what the two schemas *do* share, and it never
refuses: two schemas with nothing in common come back with an empty apex and
an `apex_coverage` of zero.

```python
span = panproto.find_span(source_schema, target_schema, proto)

print(span.apex.vertex_count)
print(span.apex_coverage)        # |apex| / |source|
print(span.quality)              # how well the covered part matches
print(span.quality_bounds)       # equal iff proven_optimal
print(span.proven_optimal)
print(span.legs_are_functorial)
print(span.apex_digest)          # lower-case hex; a cache key for the span

total = span.as_total_morphism()  # a FoundMorphism, or None
overlap = span.to_overlap()       # the pair lists a pushout takes
```

The protocol is an argument because the apex is a schema, and a schema is well
formed only against a protocol. `span.quality` ranks spans over one source
schema and nothing else, so read `apex_coverage` alongside it.

`find_span` rejects `epic=True`: a span's right leg is deliberately partial,
and the entry point is documented never to refuse for want of a match.

Classes: `TheoryMorphism` (from theory-level morphism discovery),
`SchemaMorphism` (induced from a theory morphism), `FoundMorphism`
(`vertex_map`, `edge_map`, `quality`), `SchemaSpan` (`apex`, `left`, `right`,
`quality`, `quality_bounds`, `apex_coverage`, `proven_optimal`, `is_total`,
`legs_are_functorial`, `apex_digest`).

`FoundMorphism.to_dict()` gained a third key alongside `edge_map`, so a
consumer comparing the dict's key set exactly sees a shape change.

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
schema = panproto.parse_schema_document("atproto", lexicon_doc)  # atproto is one of 43 JSON-document protocols (see below)
schema = panproto.Schema.from_atproto_lexicon(lexicon_doc)    # classmethod form
```

Parse a bundle of documents together (0.59.0+) so that references across documents resolve to real, typed vertices instead of opaque `"ref"` placeholders. Every document's definitions are registered before any document's structure is parsed; a ref whose target is in no document of the bundle stays a placeholder, marking it genuinely external. Single-document parsing is the one-document case of it, unchanged.

```python
schema = panproto.parse_schema_bundle("atproto", [referring_doc, referenced_doc])
```

## Loading any protocol's schema document or source (0.61.0+)

`parse_schema_document(protocol, doc)` dispatches to all 43 JSON-document protocols, not only `atproto`; the atproto call above is the one-protocol special case of it. So a JSON Schema (or OpenAPI, Avro, BSON, GeoJSON, ...) document loads into a `Schema` in-process and can serve as a lens or migration endpoint. The `protocol` string accepts both the hyphenated name and the underscore registry key (an underscore normalizes to a hyphen; `uima` aliases `uima-cas`). An unknown or mismatched protocol (e.g. passing a text/IDL protocol here) raises `ValueError`.

```python
schema = panproto.parse_schema_document("json-schema", {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
    },
})
```

Protocols whose source is a language rather than a JSON document (`sql`, `graphql`, `protobuf`, `cddl`, `cassandra`, `neo4j`, `redis`, `asn1`, `bond`, `flatbuffers`, `conllu`) load through the text counterpart `parse_schema_source(protocol, source)`, one of 11 text/IDL parsers. It also raises `ValueError` on an unknown or mismatched protocol.

```python
schema = panproto.parse_schema_source("sql", "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);")
schema = panproto.parse_schema_source("graphql", "type Query { hello: String }")
```

The four protocols deleted in the v0.17.0 tree-sitter migration (`json-schema`, `graphql`, `sql`, `protobuf`) are restored as first-class semantic protocols in 0.61.0, so `proto.protocol()` again reports their real object kinds (json-schema has 11, not just `object`) and they are real loadable / convert / migrate endpoints.

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

## Typed stub

The wheel ships `py.typed`, so `_native.pyi` is authoritative and a type
checker never consults the extension. Two long-standing disagreements were
closed in 0.71.0: `__len__` is declared on all four classes that implement it
(`Schema`, `Instance`, `IoRegistry`, `ProtolensChain`), so `len(schema)` type
checks; and `Repository.add` and `Repository.gc` are declared returning
dictionaries rather than `None`.

## SDK surface summary

The Python SDK exposes 47 classes and 41 module-level functions across 17
modules: schema, protocols, mig, hom, check, inst, io, lens, lexicon, gat,
expr, vcs, parse, project, git, convert, error. (0.53.0 added
`parse_atproto_lexicon`, `parse_schema_document`, and `theory_of`; 0.54.0 added
`Repository.data_at` / `Repository.add_data`; 0.59.0 added `parse_schema_bundle`
for cross-document reference resolution; 0.61.0 added `parse_schema_source`,
made `parse_schema_document` dispatch to all protocols (not just atproto), and
restored json-schema / graphql / sql / protobuf as first-class protocols; 0.67.0
put `put` and the law checks on `CompiledMigration`; 0.71.0 added `find_span`
and the `SchemaSpan` class, and made `FoundMorphism.edge_map` readable.)

## Further Reading

- [Python SDK reference](https://panproto.dev/book/reference/sdk-python.html)
- [Install panproto for Python](https://panproto.dev/book/how-to/install/python.html)
- [Define a schema from Python](https://panproto.dev/book/how-to/define-schema/python.html)
- [Find a span between two schemas](https://panproto.dev/book/how-to/spans.html)
- [`panproto` on PyPI](https://pypi.org/project/panproto/)
