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
# Parse a TypeScript file into a panproto schema
schema parse file src/index.ts

# Parse with explicit language (auto-detected by extension)
schema parse file --language typescript src/index.ts

# Output as JSON
schema parse file src/index.ts --format json > parsed.json
```

### TypeScript

```typescript
const schema = p.parseFile('src/index.ts');
// schema is a panproto Schema with:
//   - vertices for every AST node (types, functions, variables, etc.)
//   - edges for parent-child and field relationships
//   - constraints from node metadata
```

### Python

```python
registry = panproto.AstParserRegistry()
schema = registry.parse_source_file("src/main.py")
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
# Parse a project directory
schema parse project ./src

# With specific file patterns
schema parse project ./src --include "*.ts" --include "*.tsx"

# Exclude patterns
schema parse project ./src --exclude "node_modules" --exclude "*.test.ts"
```

### TypeScript

```typescript
const project = p.parseProject('./src', {
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['**/node_modules/**', '**/*.test.ts'],
});
// project.schema: unified Schema with path-prefixed vertex IDs
// project.files: per-file schemas
```

### Python

```python
project = panproto.parse_project("./src")
print(project.schema)      # unified project schema
print(project.file_count)  # number of parsed files
```

The project schema is a categorical coproduct of per-file schemas, with:
- Path-prefixed vertex IDs (e.g., `src/index.ts::FunctionDeclaration_0`)
- Cross-file import edges from the `ThImport` theory

## Round-trip emission

Parse and emit back to source code, preserving exact formatting:

### CLI

```bash
# Round-trip test (parse then emit)
schema parse emit src/index.ts
# Output should match the original file exactly

# Emit in a different language (via protolens)
schema parse emit src/index.ts --target-language python
```

Exact round-trip works because interstitial text (keywords, operators, whitespace, comments) is captured as constraints on the schema vertices. The emitter reconstructs the source from these constraints plus the AST structure.

### De novo emission via `emit_pretty` (0.40.0+)

`AstParser::emit_pretty` is a generic walker over the language's tree-sitter `grammar.json` production rules. Given a schema produced by hand or by migration (no parse-history bytes attached), it renders source text by traversing the production graph: `STRING` and `PATTERN` emit literally, `SYMBOL` recurses, `BLANK` is empty, `SEQ` concatenates children, `CHOICE` dispatches cursor-first against unconsumed children (taking the first alternative whose head matches), `REPEAT` repeats while children remain, `OPTIONAL` consumes when matchable, `FIELD`/`ALIAS`/`TOKEN`/`PREC*` are transparent. Hidden rules inline.

This is what makes by-construction schemas (e.g. the output of a migration) renderable without a CST complement. `panproto-grammars` ships `grammar.json` alongside `node-types.json` and `parser.c` for all 261 vendored grammars; `tools/fetch-grammar-json.py` refreshes them from upstream `tree-sitter-*` repos.

### Emit verification status (0.51.0+)

`emit_pretty` was rewritten in 0.51.0 to drive spacing and indentation from grammar-derived token *roles* (BracketOpen, BracketClose, Separator, Keyword, Operator, Terminal, Immediate) consulted through a pure role-pair adjacency relation, rather than from token-text inspection. As of 0.52.0, source-code emit is verified against a strict oracle — `emit(parse(emit(s))) == emit(s)` plus preservation of the schema's vertex-kind and edge-shape multisets (rejecting degenerate fixed points that drop content to `""`) — over the entire upstream `test/corpus/` of **255 of 261** vendored grammars, up from 16.

`ParserRegistry::emit_verification_status(protocol)` reports the tier per language so downstream tooling can refuse emit on unverified grammars:

| Tier | Meaning |
|------|---------|
| `Verified` | A fixed-point / round-trip test exercises emit on representative source. |
| `Generic` | The grammar is registered and the generic dispatch applies, but no test asserts emit correctness. |
| `Unsupported` | No `grammar.json` was vendored. |

The six unverified grammars are irreducible without upstream changes (the comment/todotxt/wolfram free-text grammars, less, move, and test). By-construction emit (no parse-history bytes) holds to an AST round-trip bar — the emitted source re-parses to the same kind/edge multiset — rather than byte parity.

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
registry.override_grammar(
    "my-lang".into(), vec!["myext".into()],
    language_ptr, node_types_json, None, None,
)?;
registry.register_external_grammar_owned(
    name, extensions, language, node_types, tags_query, grammar_json,
)?;
registry.unregister("my-lang");
```

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
Parse a project and use panproto's query system to analyze the structure:
```typescript
const project = p.parseProject('./src');
const functions = executeQuery(project.instance, project.schema, {
  filter: '\\node -> node.kind == "FunctionDeclaration"',
  project: ['name', 'parameters', 'return_type'],
});
```

### Migration detection
Diff two versions of parsed code to detect structural changes:
```bash
schema parse file old/index.ts > old-ast.json
schema parse file new/index.ts > new-ast.json
schema diff --src old-ast.json --tgt new-ast.json
```

## Further Reading

- [Tutorial Ch. 24: Full-AST Parsing](https://panproto.dev/tutorial/chapters/24-full-ast-parsing.html)
