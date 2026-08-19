---
name: full-ast-parsing
description: >
  Parse full ASTs of 261 programming languages using tree-sitter grammars. Covers
  schema parse file, schema parse project, auto-derived GAT theories, interstitial
  text preservation, round-trip emission, the parse/decorate/emit lens (v0.48.0+),
  runtime grammar override, and anonymous token field text query.
---

# Full-AST Parsing

You are helping a user parse source code into panproto's universal representation using tree-sitter grammars. panproto treats programs as schemas: tree-sitter `node-types.json` is structurally isomorphic to a GAT.

## Core concepts

- **261 languages** supported via tree-sitter grammars
- **Auto-derived theories**: each language's grammar automatically becomes a schema theory (sorts from node types, operations from fields)
- **Interstitial text**: keywords, punctuation, and whitespace between named children are captured for exact round-trip emission
- **One generic walker**: a single `AstWalker` handles all languages; no per-language code needed
- **Parse/decorate/emit lens** (v0.48.0+): a verified asymmetric lens connecting parsing and emission as a first-class protolens with `AbstractSchema`/`DecoratedSchema` typed distinction
- **Runtime grammar override** (v0.47.0+): register external grammars without rebuilding
- **Anonymous token field text** (v0.47.0+): `Schema::field_text(vertex_id, name)` queries named anonymous-token children without byte arithmetic

## Single file parsing

### CLI

```bash
# Parse a source file into a panproto schema. The language is detected
# from the extension; the command takes a path and nothing else.
schema parse file src/index.ts
```

### TypeScript

The WASM build carries no tree-sitter grammars, so `@panproto/core` has no AST parsing surface. Reach for the CLI, the Python wheel, or the Rust crate for this. What the SDK does carry is everything downstream of a parsed schema (diff, lens, migration, query), so a schema parsed elsewhere and serialized with `Schema::to_json` loads into the SDK with `p.parseSchemaDocument` or a `BuiltSchema` handle.

### Python

```python
registry = panproto.AstParserRegistry()

# parse_file takes the path and the bytes; the path is what selects the grammar.
with open("src/main.py", "rb") as f:
    schema = registry.parse_file("src/main.py", f.read())

# Or name the language yourself, which is what you want for a buffer with no path.
schema = registry.parse_with_protocol("python", b"def f(x): return x", "main.py")

# Module-level convenience over the default registry.
schema = panproto.parse_source_file("src/main.py", content_bytes)
```

### Rust

```rust
use panproto_parse::ParserRegistry;

let registry = ParserRegistry::new();
let schema = registry.parse_file(path, &content)?;
```

## Project parsing

Parse an entire directory into a unified project schema:

### CLI

```bash
# Parse a project directory. The path defaults to "."; there are no
# include/exclude flags, so scope the run by pointing it at a subtree.
schema parse project ./src
```

### Python

```python
project = panproto.parse_project("./src")
project.schema         # unified project schema
project.file_paths()   # every path that was parsed; len() of it is the file count
project.protocol_map() # path -> the grammar each file was parsed under

# Or assemble the set yourself, which is how you control what goes in.
builder = panproto.ProjectBuilder()
builder.add_file("src/main.py", content_bytes)
builder.add_directory("src/lib")
project = panproto.build_project(builder)
```

The project schema is a categorical coproduct of per-file schemas, with:
- Path-prefixed vertex IDs (e.g., `src/index.ts::FunctionDeclaration_0`)
- Cross-file edges of kind `imports`, synthesized by `panproto-project`'s import resolver after the coproduct is taken. An import whose path does not normalize to a file in the project, or whose target file exports nothing, is skipped silently, so the absence of an edge is not evidence the import is absent.

As of 0.70.1 a project whose files agree on a protocol is assembled *under that protocol* rather than under an internal coproduct protocol named `project`. That matters because equation diagnostics are selected by protocol name: a project whose every file was ATProto previously reported `no protocol theory registered for 'project'` and was marked valid without its theory ever being consulted. A genuinely mixed project still has no single theory to check against and now says so, naming the protocols it mixes.

## Round-trip emission

Parse and emit back to source code, preserving exact formatting:

### CLI

```bash
# Round-trip test (parse then emit): output should match the original exactly
schema parse emit src/index.ts
```

There is no `--target-language` flag. Cross-language emission goes through a protolens chain, which the CLI reaches under `schema lens` rather than under `schema parse`.

Exact round-trip works because interstitial text (keywords, operators, whitespace, comments) is captured as constraints on the schema vertices. The emitter reconstructs the source from these constraints plus the AST structure.

### De novo emission via `emit_pretty` (0.40.0+)

`AstParser::emit_pretty` is a generic walker over the language's tree-sitter `grammar.json` production rules. Given a schema produced by hand or by migration (no parse-history bytes attached), it renders source text by traversing the production graph: `STRING` and `PATTERN` emit literally, `SYMBOL` recurses, `BLANK` is empty, `SEQ` concatenates children, `CHOICE` dispatches cursor-first against unconsumed children (taking the first alternative whose head matches), `REPEAT` repeats while children remain, `OPTIONAL` consumes when matchable, `FIELD`/`ALIAS`/`TOKEN`/`PREC*` are transparent. Hidden rules inline.

This is what makes by-construction schemas (e.g. the output of a migration) renderable without a CST complement. `panproto-grammars` ships `grammar.json` alongside `node-types.json` and `parser.c` for all 261 vendored grammars; `tools/fetch-grammar-json.py` refreshes them from upstream `tree-sitter-*` repos.

### Emit verification status (0.51.0+)

`emit_pretty` was rewritten in 0.51.0 to drive spacing and indentation from grammar-derived token *roles* (BracketOpen, BracketClose, Separator, Keyword, Operator, Terminal, Immediate) consulted through a pure role-pair adjacency relation, rather than from token-text inspection. As of 0.52.0, source-code emit is verified against a strict oracle (`emit(parse(emit(s))) == emit(s)`, plus preservation of the schema's vertex-kind and edge-shape multisets, which rejects degenerate fixed points that drop content to `""`) over the entire upstream `test/corpus/` of **255 of 261** vendored grammars, up from 16.

`ParserRegistry::emit_verification_status(protocol)` reports the tier per language so downstream tooling can refuse emit on unverified grammars:

| Tier | Meaning |
|------|---------|
| `Verified` | A fixed-point / round-trip test exercises emit on representative source. |
| `Generic` | The grammar is registered and the generic dispatch applies, but no test asserts emit correctness. |
| `Unsupported` | The protocol is not registered, or is registered with no vendored `grammar.json`. `emit_pretty` returns `ParseError::EmitFailed`. |

The six unverified grammars are irreducible without upstream changes (the comment/todotxt/wolfram free-text grammars, less, move, and test). By-construction emit (no parse-history bytes) holds to an AST round-trip bar (the emitted source re-parses to the same kind/edge multiset) rather than to byte parity.

### `ParseEmitLens` (0.40.0+)

`panproto_parse::parse_emit_lens` packages the per-language parse / emit pair as an asymmetric `Lens<bytes, schema>`. Forward goes through the language's parser; backward through `emit_pretty`. Two laws are machine-checkable on concrete inputs:

| Law | Function | What it asserts |
|-----|----------|-----------------|
| EmitParse retraction | `check_emit_parse(schema)` | `parse(emit(s)) ≅ s` modulo byte positions |
| ParseEmit stability | `check_parse_emit(bytes)` | `emit(parse(b)) == b` byte-for-byte when `b` is parseable |

Structural equivalence in EmitParse is witnessed by a pair of multisets: `kind_multiset` (vertex kinds) and `edge_multiset` (`(src_kind, edge_kind, tgt_kind)` triples). The vertex multiset alone doesn't distinguish a tree from its mirror, so the edge witness carries weight. The `strip_complement` helper removes byte-position constraints while preserving the choice discriminators the walker recorded at parse time, which is what makes the retraction tight rather than approximate.

### Parse/decorate/emit protolens (0.48.0+)

The parse/emit pair is now a first-class protolens via `ParserRegistry::parse_emit_protolens()`. This enables composition with other protolens steps in a chain.

The key typed distinction: `AbstractSchema` (no layout constraints) vs `DecoratedSchema` (full layout fibre: `start-byte`, `end-byte`, `interstitial-N`, `chose-alt-fingerprint`, `chose-alt-child-kinds`).

- `SchemaBuilder::build_abstract()` returns `AbstractSchema`, rejecting any layout-fibre constraints
- `SchemaBuilder::build_decorated()` returns `DecoratedSchema` when layout constraints are present
- `Schema::forget_layout()` strips layout sorts (forgetful functor U)
- `ParserRegistry::decorate(lang, abstract_schema, policy)` synthesizes the layout fibre (section of U)

The section law: `forget_layout(decorate(a, p)) ≅_kind a` (equal up to vertex-id renaming and the kind/edge multiset).

Layout enrichment uses the Grothendieck fibration framing: `EnrichmentKind::Layout` tags the fibre, and `TheoryTransform::StripEnrichment` / `TheoryTransform::AddEnrichment` are the protolens-level transforms. The cross-crate `LayoutEnricher` trait in `panproto-lens::enrichment_registry` is populated by `panproto-parse` at `ParserRegistry::new` time.

```rust
use panproto_core::parse::{LayoutPolicy, ParserRegistry};

let reg = ParserRegistry::new();
let policy = LayoutPolicy::default();
let decorated = reg.decorate("typescript", &abstract_schema, &policy)?;
// decorated can now be emitted via emit_pretty
```

### Runtime grammar override (0.47.0+)

Register external grammars at runtime without rebuilding panproto:

```rust
// language: tree_sitter::Language, node_types_json: Vec<u8>,
// tags_query: Option<String>, grammar_json: Option<Vec<u8>>.
registry.override_grammar(
    "my-lang".to_owned(), vec!["myext".to_owned()],
    language, node_types_json, None, None,
)?;

// The same registration without the preceding unregister.
registry.register_external_grammar_owned(
    name, extensions, language, node_types_json, tags_query, grammar_json,
)?;

registry.unregister("my-lang");   // -> bool: whether a parser was removed
```

The owned variants leak their inputs to satisfy the trait's `'static` requirement, one leak per override, which is why they are documented as a grammar-author workflow. A production build bakes the grammar in at compile time with `register_external_grammar`, whose arguments are `&'static`.

Python: `AstParserRegistry.override_grammar(name, extensions, language_ptr, node_types, tags_query=None, grammar_json=None)`

### Anonymous token field text (0.47.0+)

Query named anonymous-token children (tree-sitter `field('name', token)`) directly:

```rust
let text: Option<&str> = schema.field_text(vertex_id, "operator");
```

Python: `schema.field_text(vertex_id, name)`

### IdGenerator disambiguation (0.50.0+)

Repeated names at the same scope are disambiguated: `foo`, `foo#1`, `foo#2`. This prevents vertex-id collisions when a scope contains multiple definitions of the same name.

## Auto-derived theories

Each language's grammar automatically generates a schema theory.

The theory extraction pipeline:
1. Reads `node-types.json` from the tree-sitter grammar
2. Creates a `Sort` for each node type
3. Creates an `Operation` for each field name
4. Preserves supertype relationships

Example (simplified) for TypeScript:
```
Sort: Program, FunctionDeclaration, Identifier, TypeAnnotation, ...
Op: name (FunctionDeclaration -> Identifier)
Op: parameters (FunctionDeclaration -> FormalParameters)
Op: return_type (FunctionDeclaration -> TypeAnnotation)
Op: body (FunctionDeclaration -> StatementBlock)
```

## Supported languages

Top languages by category:

| Category | Languages |
|----------|-----------|
| Systems | C, C++, Rust, Go, Zig |
| Web | TypeScript, JavaScript, HTML, CSS, SCSS |
| Backend | Python, Ruby, Java, Kotlin, C#, PHP |
| Functional | Haskell, OCaml, Elixir, Clojure, Lean |
| Data | SQL, JSON, YAML, TOML, XML |
| Schema | Protobuf, GraphQL, Thrift |
| Config | Dockerfile, HCL (Terraform), Nix |
| Shell | Bash, Zsh, Fish, PowerShell |
| Mobile | Swift, Dart, Objective-C |
| Scientific | R, Julia, MATLAB, Fortran |

Full list: 261 languages across 11 grammar groups (core, web, systems, jvm, scripting, data, functional, devops, mobile, music, all).

## Use cases

### Schema extraction from code
Parse your codebase to extract the de facto schema from type definitions, database models, or API handlers.

### Cross-language refactoring
Parse in one language, apply protolens transformations, emit in another. The protolens guarantees syntactic validity by construction.

### Codebase analysis
Parse a project, then query the instance over its schema. `executeQuery` takes the query first, then the instance, then the WASM module:

```typescript
const matches = executeQuery(
  {
    anchor: 'FunctionDeclaration',
    projection: ['name', 'parameters', 'return_type'],
    limit: 50,
  },
  instance,
  p._wasm,
);
```

### Migration detection
Diff two versions of parsed code to detect structural changes. `schema parse file` prints a summary line rather than the schema, so serialize the two schemas yourself and hand the files to `schema diff`, whose operands are positional:

```python
import panproto

reg = panproto.AstParserRegistry()
for label, path in (("old", "old/index.ts"), ("new", "new/index.ts")):
    with open(path, "rb") as f:
        schema = reg.parse_file(path, f.read())
    with open(f"{label}-ast.json", "w") as out:
        out.write(schema.to_json())
```

```bash
schema diff old-ast.json new-ast.json --detect-renames
```

`schema auto-migrate` answers the adjacent question, how much of the old tree has an image in the new one, and as of 0.71.0 never refuses for want of a total morphism. It is not reachable on an AST schema from the CLI, though: it resolves the source schema's protocol, a parsed AST schema names its language there, and the CLI resolves `atproto` alone. In-process, `panproto.find_span(old, new, protocol)` takes whatever `Protocol` you hand it.

## Further Reading

- [Tutorial Ch. 24: Full-AST Parsing](https://panproto.dev/tutorial/chapters/24-full-ast-parsing.html)
