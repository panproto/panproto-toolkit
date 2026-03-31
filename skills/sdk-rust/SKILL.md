---
name: sdk-rust
description: >
  Complete guide for using panproto as a Rust library. Covers panproto-core dependency
  setup, feature flags (full-parse, project, git, llvm, jit), and direct API usage.
user-invocable: true
---

# Rust SDK Guide (panproto-core)

You are helping a user work with panproto as a Rust library via the `panproto-core` facade crate.

## Installation

Add to your `Cargo.toml`:
```toml
[dependencies]
panproto-core = "0.22"
```

### Feature flags

`panproto-core` re-exports all sub-crates. Optional features gate heavier dependencies:

| Feature | What it enables | Extra deps |
|---------|----------------|-----------|
| (default) | GAT, schema, inst, mig, lens, check, protocols, io, vcs, expr | None heavy |
| `full-parse` | Tree-sitter full-AST parsing (248 languages) | tree-sitter + grammars |
| `project` | Multi-file project assembly | full-parse |
| `git` | Git bridge (import/export) | libgit2 |
| `llvm` | LLVM IR protocol and lowering morphisms | (no runtime dep) |
| `jit` | LLVM JIT compilation of expressions | inkwell + LLVM |

```toml
# Example: core + parsing + git bridge
panproto-core = { version = "0.22", features = ["full-parse", "git"] }
```

Or depend on individual crates for finer control:
```toml
panproto-gat = "0.22"
panproto-schema = "0.22"
panproto-mig = "0.22"
panproto-lens = "0.22"
```

## Quick start

```rust
use panproto_core::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load a built-in protocol
    let proto = panproto_protocols::atproto::protocol();

    // Build a schema
    let schema = schema::SchemaBuilder::new(&proto)
        .vertex("post", "record", Some("app.bsky.feed.post"))?
        .vertex("post:body", "object", None)?
        .vertex("post:body.text", "string", None)?
        .edge("post", "post:body", "record-schema", None)?
        .edge("post:body", "post:body.text", "prop", Some("text"))?
        .constraint("post:body.text", "maxLength", "3000")
        .build()?;

    // Auto-generate a lens between two schema versions
    let lens = panproto_lens::auto_generate(&old_schema, &new_schema)?;
    let (view, complement) = panproto_lens::get(&lens, &instance)?;

    Ok(())
}
```

## Core APIs by crate

### panproto_gat (Level 0: GAT engine)

```rust
use panproto_gat::*;

// Create a theory
let theory = Theory { name: "MyTheory".into(), sorts: vec![...], ops: vec![...], eqs: vec![] };

// Compose theories via colimit
let composed = colimit(&theory_a, &theory_b, &shared)?;

// Check a morphism preserves structure
check_morphism(&morphism)?;

// Type-check a term against a theory
typecheck_term(&theory, &term)?;

// Generate a free model (test data)
let model = free_model(&theory)?;
```

### panproto_schema (Level 1: schemas)

```rust
use panproto_schema::*;

let proto = panproto_protocols::openapi::protocol();
let schema = SchemaBuilder::new(&proto)
    .vertex("user", "object", None)?
    .vertex("user.name", "string", None)?
    .edge("user", "user.name", "property", Some("name"))?
    .constraint("user.name", "required", "true")
    .build()?;

// Validate
schema.validate(&proto)?;

// Normalize (collapse reference chains)
let normalized = schema.normalize()?;
```

### panproto_inst (Level 2: instances)

```rust
use panproto_inst::*;

// Parse JSON into a W-type instance
let instance = parse_json(&schema, &json_value)?;

// Validate instance against schema
validate_wtype(&instance, &schema)?;

// Convert instance to JSON
let json = instance.to_json(&schema)?;
```

### panproto_mig (migrations)

```rust
use panproto_mig::*;

// Check existence conditions
check_existence(&old_schema, &new_schema, &migration)?;

// Compile for fast per-record application
let compiled = compile(&old_schema, &new_schema, &migration)?;

// Lift a record
let result = lift_wtype(&instance, &old_schema, &new_schema, &compiled)?;

// Compose two migrations
let composed = compose(&mig_ab, &mig_bc)?;

// Auto-discover morphisms via CSP
let morphisms = find_morphisms(&schema_a, &schema_b)?;
```

### panproto_lens (lenses and protolenses)

```rust
use panproto_lens::*;

// Auto-generate a lens
let lens = auto_generate(&old_schema, &new_schema)?;

// Forward projection (get)
let (view, complement) = get(&lens, &instance)?;

// Backward restoration (put)
let restored = put(&lens, &modified_view, &complement)?;

// Compose lenses
let composed = compose(&lens_ab, &lens_bc)?;

// Verify round-trip laws
let laws = check_laws(&lens, &test_instance)?;
assert!(laws.get_put);
assert!(laws.put_get);
```

### panproto_check (breaking changes)

```rust
use panproto_check::*;

let diff = diff(&old_schema, &new_schema);
let report = classify(&diff, &proto);

println!("{}", report.report_text());
println!("Compatible: {}", report.compatible);
```

### panproto_io (instance I/O)

```rust
use panproto_io::*;

let registry = default_registry();
let instance = registry.parse("atproto", &data)?;
let output = registry.emit("openapi", &instance)?;
```

### panproto_vcs (version control)

```rust
use panproto_vcs::*;

let repo = Repository::init(".")?;
repo.add("schemas/post.json")?;
repo.commit("initial schema", "author", chrono::Utc::now())?;
repo.branch("feature")?;
repo.checkout("feature")?;

// Merge via categorical pushout
repo.checkout("main")?;
repo.merge("feature")?;
```

### panproto_expr (expressions)

```rust
use panproto_expr::*;
use panproto_expr_parser::*;

let expr = parse("\\x -> x + 1")?;
let result = eval(&expr, &env)?;
```

### panproto_parse (full-AST parsing, requires `full-parse` feature)

```rust
use panproto_parse::*;

let registry = ParserRegistry::new();
let schema = registry.parse_file(path, &content)?;
let emitted = registry.emit_with_protocol("lean4", &schema)?;
```

## Error handling

Each crate defines its own error type via `thiserror`:

| Crate | Error type |
|-------|-----------|
| panproto-gat | `GatError` |
| panproto-schema | `SchemaError` |
| panproto-inst | `InstError` |
| panproto-mig | `MigError` |
| panproto-lens | `LensError` |
| panproto-check | `CheckError` |

All errors are `#[non_exhaustive]` and implement `std::error::Error`. Use `?` for propagation or match on specific variants:

```rust
match panproto_mig::compile(&src, &tgt, &mig) {
    Ok(compiled) => { /* use compiled */ }
    Err(MigError::ExistenceViolation(issues)) => {
        for issue in issues {
            eprintln!("  {issue}");
        }
    }
    Err(e) => return Err(e.into()),
}
```

## Performance notes

- Use `FxHashMap` / `FxHashSet` (from `rustc-hash`) for internal maps
- `SmallVec<[T; 4]>` for adjacency lists and small collections
- `bumpalo` arena allocation in hot paths (lift_wtype)
- `lift_wtype` target: < 1us/record for simple projections

## Further Reading

- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html) (Rust examples)
- [panproto-core docs.rs](https://docs.rs/panproto-core)
