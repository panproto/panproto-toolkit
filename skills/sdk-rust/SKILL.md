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
panproto-core = "0.27"
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
panproto-core = { version = "0.27", features = ["full-parse", "git"] }
```

Or depend on individual crates for finer control:
```toml
panproto-gat = "0.27"
panproto-schema = "0.27"
panproto-mig = "0.27"
panproto-lens = "0.27"
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
    let config = panproto_lens::AutoLensConfig::default();
    let result = panproto_lens::auto_generate(&old_schema, &new_schema, &proto, &config)?;
    let (view, complement) = panproto_lens::get(&result.lens, &instance)?;

    Ok(())
}
```

## Core APIs by crate

### panproto_gat (Level 0: GAT engine)

```rust
use panproto_gat::*;

// Create a theory
let theory = Theory { name: "MyTheory".into(), sorts: vec![...], ops: vec![...], eqs: vec![] };

// Compose theories via colimit (takes two theories + two inclusion morphisms)
let result = colimit(&theory_a, &theory_b, &inclusion_a, &inclusion_b)?;

// Check a morphism preserves structure
check_morphism(&morphism, &domain, &codomain)?;

// Type-check a term against a theory
typecheck_term(&term, &ctx, &theory)?;

// Generate a free model (test data)
let config = FreeModelConfig::default();
let result = free_model(&theory, &config)?;
```

### panproto_schema (Level 1: schemas)

```rust
use panproto_schema::*;

let proto = panproto_protocols::api::openapi::protocol();
let schema = SchemaBuilder::new(&proto)
    .vertex("user", "object", None)?
    .vertex("user.name", "string", None)?
    .edge("user", "user.name", "property", Some("name"))?
    .constraint("user.name", "required", "true")
    .build()?;

// Validate (free function, not a method)
let errors = panproto_schema::validate(&schema, &proto);

// Normalize (collapse reference chains)
let normalized = panproto_schema::normalize(&schema);
```

### panproto_inst (Level 2: instances)

```rust
use panproto_inst::*;

// Parse JSON into a W-type instance (requires root vertex name)
let instance = parse_json(&schema, "root_vertex", &json_value)?;

// Validate instance against schema (returns Vec<ValidationError>)
let errors = validate_wtype(&schema, &instance);

// Convert instance to JSON
let json = instance.to_json(&schema)?;
```

### panproto_mig (migrations)

```rust
use panproto_mig::*;

// Check existence conditions
check_existence(&protocol, &old_schema, &new_schema, &migration, &theory_registry)?;

// Compile for fast per-record application
let compiled = compile(&old_schema, &new_schema, &migration)?;

// Lift a record (note arg order: compiled first, then schemas, then instance)
let result = lift_wtype(&compiled, &old_schema, &new_schema, &instance)?;

// Compose two migrations
let composed = compose(&mig_ab, &mig_bc)?;

// Auto-discover morphisms via CSP
let morphisms = find_morphisms(&schema_a, &schema_b, &search_opts);

// Constrained morphism search (0.26.0+)
let constraints = DomainConstraints {
    restricted_domains: HashMap::new(),
    excluded_targets: HashSet::new(),
    excluded_sources: HashSet::new(),
    scoring_weights: Some([1.0, 0.5, 0.3, 0.2]),
    name_similarity_threshold: Some(0.6),
};
let best = find_best_morphism_constrained(&schema_a, &schema_b, &search_opts, &constraints);
```

### panproto_lens (lenses and protolenses)

```rust
use panproto_lens::*;

// Auto-generate a lens (requires protocol and config)
let config = AutoLensConfig::default();
let result = auto_generate(&old_schema, &new_schema, &protocol, &config)?;
let lens = result.lens;

// Forward projection (get)
let (view, complement) = get(&lens, &instance)?;

// Backward restoration (put)
let restored = put(&lens, &modified_view, &complement)?;

// Compose lenses
let composed = compose(&lens_ab, &lens_bc)?;

// Verify round-trip laws (returns Result<(), LawViolation>)
check_laws(&lens, &test_instance)?;

// Hint-guided auto-generation (0.26.0+)
use panproto_lens::hint::{HintParts, resolve_hints};

let parts = HintParts {
    anchors: [("post".into(), "article".into())].into(),
    scope_pairs: vec![("post:body".into(), "article:content".into())],
    excluded_targets: vec![],
    excluded_sources: vec![],
    scoring_weights: None,
    name_similarity_threshold: None,
};
let (anchors, domain_constraints) = resolve_hints(&parts, &old_schema, &new_schema);
let result = auto_generate_with_hints(
    &old_schema, &new_schema, &protocol, &config,
    &anchors, &domain_constraints, Some(0.5),
)?;
```

### panproto_check (breaking changes)

```rust
use panproto_check::*;

let diff = diff(&old_schema, &new_schema);
let report = classify(&diff, &proto);

println!("{}", panproto_check::report_text(&report));
println!("Compatible: {}", report.compatible);
```

### panproto_io (instance I/O)

```rust
use panproto_io::*;

let registry = default_registry();
let instance = registry.parse_wtype("atproto", &schema, &data)?;
let output = registry.emit_wtype("openapi", &schema, &instance)?;
```

### panproto_vcs (version control)

```rust
use panproto_vcs::*;
use std::path::Path;

let mut repo = Repository::init(Path::new("."))?;
repo.add("schemas/post.json")?;
repo.commit("initial schema", "author")?;
repo.branch("feature")?;
repo.checkout("feature")?;

// Merge via categorical pushout
repo.checkout("main")?;
repo.merge("feature")?;
```

### panproto_expr (expressions)

```rust
use std::sync::Arc;
use panproto_expr::*;
use panproto_expr_parser;

// Two-step: tokenize then parse
let tokens = panproto_expr_parser::tokenize("\\x -> x + 1")?;
let expr = panproto_expr_parser::parse(&tokens)?;

// Evaluate with an environment
let env = Env::new().extend(Arc::from("x"), Literal::Int(5));
let config = EvalConfig { max_steps: 10_000, max_depth: 100, max_list_len: 1000 };
let result = eval(&expr, &env, &config)?;
// result == Literal::Int(6)
```

**Note:** `Env::extend` takes `Arc<str>` keys (not `&str`). `Literal::Record` uses `Vec<(Arc<str>, Literal)>` (not `HashMap`).

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
    Err(ExistenceError::EdgeMissing { src, tgt, kind }) => {
        eprintln!("  missing edge: {src} -> {tgt} (kind: {kind})");
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
