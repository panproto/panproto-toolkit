---
name: full-ast-parsing
description: >
  Parse full ASTs of 248 programming languages using tree-sitter grammars. Covers
  schema parse file, schema parse project, auto-derived GAT theories, interstitial
  text preservation, and round-trip emission.
---

# Full-AST Parsing

You are helping a user parse source code into panproto's universal representation using tree-sitter grammars. panproto treats programs as schemas: tree-sitter `node-types.json` is structurally isomorphic to a GAT.

## Core concepts

- **248 languages** supported via tree-sitter grammars
- **Auto-derived theories**: each language's grammar automatically becomes a schema theory (sorts from node types, operations from fields)
- **Interstitial text**: keywords, punctuation, and whitespace between named children are captured for exact round-trip emission
- **One generic walker**: a single `AstWalker` handles all languages; no per-language code needed

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

Full list: 248 languages.

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
