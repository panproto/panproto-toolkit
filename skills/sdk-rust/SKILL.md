---
name: sdk-rust
description: >
  Complete guide for using panproto as a Rust library. Covers panproto-core dependency
  setup, feature flags (full-parse, project, git, tree-sitter), the span search, and
  direct API usage.
user-invocable: true
---

# Rust SDK Guide (panproto-core)

You are helping a user work with panproto as a Rust library via the `panproto-core` facade crate.

## Installation

Add to your `Cargo.toml`:
```toml
[dependencies]
panproto-core = "0.71"
```

### Feature flags

`panproto-core` re-exports all sub-crates as module aliases (`schema`, `mig`, `lens`, `inst`, `gat`, `check`, `io`, `vcs`, `expr`, `expr_parser`, `protocols`, `lens_dsl`, `theory_dsl`). Optional features gate heavier dependencies:

| Feature | What it enables | Extra deps |
|---------|----------------|-----------|
| (default) | GAT, schema, inst, mig, lens, check, protocols, io, vcs, expr, lens-dsl, theory-dsl | None heavy |
| `full-parse` | Tree-sitter full-AST parsing (261 languages) | tree-sitter + grammars |
| `project` | Multi-file project assembly | full-parse |
| `git` | Git bridge (import/export) | project |
| `tree-sitter` | Format-preserving parsing in `panproto-io` | tree-sitter |

```toml
# Example: core + parsing + git bridge
panproto-core = { version = "0.71", features = ["full-parse", "git"] }
```

Or depend on individual crates for finer control:
```toml
panproto-gat = "0.71"
panproto-schema = "0.71"
panproto-mig = "0.71"
panproto-lens = "0.71"
```

## Quick start

```rust
use panproto_core::{lens, protocols, schema};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load a built-in protocol
    let proto = protocols::atproto::protocol();

    // Build a schema
    let old = schema::SchemaBuilder::new(&proto)
        .vertex("post", "record", Some("app.bsky.feed.post"))?
        .vertex("post:body", "object", None::<&str>)?
        .vertex("post:body.text", "string", None::<&str>)?
        .edge("post", "post:body", "record-schema", None)?
        .edge("post:body", "post:body.text", "prop", Some("text"))?
        .constraint("post:body.text", "maxLength", "3000")
        .build()?;

    // Auto-generate a lens between two schema versions
    let config = lens::AutoLensConfig::default();
    let result = lens::auto_generate(&old, &new, &proto, &config)?;
    let (view, complement) = lens::get(&result.lens, &instance)?;

    Ok(())
}
```

The facade aliases are the paths to use. Writing `panproto_protocols::atproto::protocol()` needs `panproto-protocols` as a direct dependency; `protocols::atproto::protocol()` works from `panproto-core` alone.

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

#### Cutting a sub-schema: `induce` (0.71.0+)

`induce` and `induce_on_vertices` are the supported way to take part of a
schema and get a schema back. They account for every one of the twenty-one
`Schema` fields in its own key space, rebuild the three adjacency indices,
and validate the result against the protocol, reporting
`SchemaError::InducedSchemaInvalid` with the findings when it does not hold.
This is what makes a span's apex a schema rather than a fragment.

```rust
use std::collections::HashSet;
use panproto_schema::{induce, induce_on_vertices};

// Keep a vertex set and every edge between survivors.
let keep: HashSet<_> = ["post", "post:body"].into_iter().map(Into::into).collect();
let sub = induce_on_vertices(&schema, &proto, &keep)?;

// Or name both sets.
let sub = induce(&schema, &proto, &keep_vertices, &keep_edges)?;
```

Ids naming no vertex are ignored on every rule, so a dangling reference in the
parent does not reach the result.

#### Content identity: `canonical_digest` (0.71.0+)

```rust
use panproto_schema::{canonical_bytes, canonical_digest};

let digest: [u8; 32] = canonical_digest(&schema);
let bytes: Vec<u8> = canonical_bytes(&schema);
```

Two schemas equal as values digest equal. This deliberately disagrees with
`panproto_vcs::hash::CanonicalSchema`, which covers seventeen fields and
normalises: `canonical_digest` covers all twenty-one, including `entries` and
the three adjacency indices, and writes every `Vec` in stored order, so a
schema and its re-indexed twin digest differently. That is the property the
span search needs and the VCS does not.

#### Theory → Schema bridge: `Protocol::from_theories` (0.42.0+)

If you've built a `Theory` directly (via `Theory::new`, the `class!` /
`inductive!` macros, or `panproto-theory-dsl`), `Protocol::from_theories`
is the bridge to a `SchemaBuilder`:

```rust
use panproto_schema::Protocol;

let proto = Protocol::from_theories(
    "my_protocol",
    schema_theory,                       // Theory or theory name
    instance_theory,                     // Option<Theory>
    obj_kinds.iter().map(String::as_str).collect(),
)?;

let schema = proto.schema()
    .vertex("root", "object", None)?
    .build()?;
```

The Python equivalent is `panproto.Protocol.from_theories(...)`. Closes the gap between hand-rolled theories and `Repository.add` / `parse_with_protocol`.

### panproto_inst (Level 2: instances)

```rust
use panproto_inst::*;

// Parse JSON into a W-type instance (requires root vertex name)
let instance = parse_json(&schema, "root_vertex", &json_value)?;

// Validate instance against schema (returns Vec<ValidationError>)
let errors = validate_wtype(&schema, &instance);

// Convert instance to JSON (free function, schema first; infallible)
let json = panproto_inst::to_json(&schema, &instance);
```

### panproto_mig (migrations)

```rust
use panproto_mig::*;

// Check existence conditions (returns a report, not a Result)
let report: ExistenceReport =
    check_existence(&protocol, &old_schema, &new_schema, &migration, &theory_registry);

// Compile for fast per-record application
let compiled = compile(&old_schema, &new_schema, &migration)?;

// Lift a record (note arg order: compiled first, then schemas, then instance)
let result = lift_wtype(&compiled, &old_schema, &new_schema, &instance)?;

// Compose two migrations
let composed = compose(&mig_ab, &mig_bc)?;
```

#### The span is the primary search result (0.71.0+)

`find_span` answers with a span `src ←ℓ─ A ─r→ tgt` whose apex `A` is the
sub-schema of the source induced on the vertices the search gave a target.
It never refuses for want of a match: leaving every vertex out is feasible,
so two schemas with nothing in common come back with an empty apex and an
`apex_coverage` of zero. On real schema pairs that is the ordinary answer,
because most admit no total morphism at all.

The protocol is an argument because the apex is a schema, and a schema is
well formed only against a protocol; a schema stores only its protocol's name.

```rust
use panproto_mig::{SearchOptions, find_span};

let span = find_span(&schema_a, &schema_b, &protocol, &SearchOptions::default())?;

println!("{} of the source", span.apex_coverage);   // |apex| / |src|
println!("{}", span.quality);                        // how well the covered part matches
println!("{:?}", span.quality_bounds);               // equal iff proven_optimal
println!("{}", span.certificate.proven_optimal);
println!("{}", span.certificate.legs_are_functorial);
println!("{}", span.apex_digest_hex());              // the span's cache key

// The older shape, when the span happens to cover the whole source.
if let Some(total) = span.as_total_morphism() { /* ... */ }

// The pair lists a pushout takes.
let overlap = span.to_overlap();
```

`span.quality` is a ranking signal among spans over **one** source schema.
Every denominator of the objective is fixed by `src`, so comparing it across
sources compares two different scales; read `apex_coverage` alongside it.

#### Total morphisms are the degenerate case

`find_morphisms` and `find_best_morphism` are the same search with `⊥` removed
from every domain. Both now return a `Result`, and the distinction it carries
matters: `Ok(vec![])` / `Ok(None)` means no total morphism exists, while `Err`
means the search could not be posed or could not finish. Spelling the second as
the first is what told a schema searched against *itself* that its identity
morphism did not exist.

`find_morphisms` no longer enumerates the hom-set. It returns the morphisms
*attaining* the optimum, so every element carries the same quality and there is
no suboptimal alternative further down the list. `DEFAULT_OPTIMA_CAP` (1024)
bounds every request, not only `max_results = 0`, and `MorphismList::truncated`
reports when it bound.

```rust
use std::collections::{HashMap, HashSet};
use panproto_mig::{
    CostWeights, DomainConstraints, SearchBudget, SearchOptions,
    find_best_morphism_constrained, find_morphisms, find_morphisms_budgeted,
};

let opts = SearchOptions {
    monic: false,
    epic: false,
    iso: false,
    max_results: 8,
    // Mappings the caller *knows*; the search may not reconsider them.
    hard_pins: HashMap::new(),
};

let list = find_morphisms(&schema_a, &schema_b, &opts)?;
println!("{} optima, truncated: {}", list.morphisms.len(), list.truncated);

// Hard domain restrictions and an objective override.
let constraints = DomainConstraints {
    restricted_domains: HashMap::new(),
    excluded_targets: HashSet::new(),
    excluded_sources: HashSet::new(),
    // Five components (name, edge, prop, degree, anchor), checked and
    // normalised by the sum, so only their ratios survive.
    scoring_weights: Some(CostWeights::new(1.0, 0.5, 0.3, 0.2, 0.0)?),
};
let best = find_best_morphism_constrained(&schema_a, &schema_b, &opts, &constraints)?;

// A caller that has to bound the search passes the budget rather than
// spending `SearchBudget::default`.
let list = find_morphisms_budgeted(
    &schema_a, &schema_b, &opts, &constraints, &SearchBudget::default(),
)?;
```

Four settings are gone. `SearchOptions::initial` is now `hard_pins`, renamed to
say what it does: a hard restriction the search may not reconsider, not a
starting point. `preferred`, `max_nodes` and `relax_edge_name_pruning` are
removed, as is `DomainConstraints::name_similarity_threshold`. Soft evidence is
now a unary cost rather than an ordering, the node budget lives on
`SearchBudget`, and a similarity threshold cut a soft signal at a hard edge.

Two behaviours changed underneath the same names. `excluded_sources` now forces
`⊥` rather than removing the variable, so a total-morphism request that excludes
any source vertex answers empty; ask for a span instead. And `epic` is enforced
inside branch and bound rather than filtered from its answer, so a surjective
total morphism is returned whenever one exists. `find_span` rejects `epic` with
`SpanError::EpicIsNotASpanProperty`, because a span's right leg is deliberately
partial.

#### Merging along a span

```rust
use panproto_mig::discover_overlap;

// Takes a protocol and returns a Result; the overlap is the maximum
// common induced sub-schema, not whichever schema embedded further.
let overlap = discover_overlap(&left, &right, &protocol)?;
let (merged, left_leg, right_leg) =
    panproto_schema::schema_pushout(&left, &right, &overlap)?;

// Or straight off a span, which checks the leg first.
let (merged, left_leg, right_leg) = span.pushout(&schema_a, &schema_b)?;
```

`SchemaSpan::pushout` reports `SpanError::ContractingRightLeg` when the right
leg sends two apex vertices to one target vertex. Merging along the apex has to
commute, and a repeated key names only one preimage, so the square that used to
come back was not a cocone over the span it was asked about.

An empty overlap means no common *induced* sub-schema. Inducing carries every
arc between the chosen vertices, so a single self-loop on the target side makes
an otherwise shared vertex unshareable; it is not evidence that the two schemas
share nothing vertex by vertex.

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

// Reconstruct a source from a stored view, when the lens is an isomorphism
if result.lens.is_isomorphism() {
    let restored = put_without_complement(&result.lens, &view)?;
} else {
    println!("{:?}", result.lens.obstruction_to_isomorphism());
}

// Hint-guided auto-generation (0.26.0+)
use panproto_lens::hint::{HintParts, resolve_hints};

let parts = HintParts {
    anchors: [("post".into(), "article".into())].into(),
    scope_pairs: vec![("post:body".into(), "article:content".into())],
    excluded_targets: vec![],
    excluded_sources: vec![],
    scoring_weights: None,
};
let (anchors, domain_constraints) = resolve_hints(&parts, &old_schema, &new_schema);
let result = auto_generate_with_hints(
    &old_schema, &new_schema, &protocol, &config,
    &anchors, &domain_constraints, Some(0.5),
)?;
```

`HintParts::name_similarity_threshold` is gone with the search option it fed.
A `SimilarName` preference in a `HintSpec` still reaches the objective as the
weight on its name component, but it is no longer a cut: a candidate scoring
below the threshold is searched and scored lower rather than removed. A caller
wanting a genuine restriction states a scope or an exclusion.

Two `auto_generate` behaviours changed in 0.71.0. The pinned and released
searches are now compared on the objective and the better kept, rather than the
pinned one short-circuiting as soon as it covered every source vertex; and the
lens no longer pre-excludes source vertices it guesses are infeasible, so
fields that used to disappear at a span tier now survive.

### panproto_check (breaking changes)

```rust
use panproto_check::*;

let diff = diff(&old_schema, &new_schema);
let report = classify(&diff, &proto);

println!("{}", panproto_check::report_text(&report));
println!("Compatible: {}", report.compatible);
println!("{:?}", report.classification);   // the tri-state verdict
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
use panproto_vcs::{Repository, refs};
use std::path::Path;

let mut repo = Repository::init(Path::new("."))?;

// `add` takes the schema itself, not a path.
repo.add(&schema)?;
let head = repo.commit("initial schema", "author")?;

// Branch and checkout act on the store rather than the repository.
refs::create_branch(repo.store_mut(), "feature", head)?;
refs::checkout_branch(repo.store_mut(), "feature")?;

// Merge via categorical pushout
refs::checkout_branch(repo.store_mut(), "main")?;
let result = repo.merge("feature", "author")?;

for commit in repo.log(Some(20))? {
    println!("{}", commit.message);
}
```

`add_with_options(&schema, &AddOptions { skip_verify })` skips the per-`add` GAT
model check, which is what makes replaying a long history of already-validated
versions practical. `add_tree` keeps a per-file project tree's root in the index
so an unchanged sibling keeps its object id.

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
| panproto-mig | `MigError`, plus `SpanError`, `ExistenceError`, `ComposeError`, `InvertError`, `LiftError` per operation |
| panproto-lens | `LensError` |
| panproto-check | `CheckError` |

The morphism and span entry points report `SpanError`, whose six variants are
`Build`, `Apex`, `Stopped`, `Iso`, `EpicIsNotASpanProperty` and
`ContractingRightLeg`. Two are worth knowing by name. `Stopped { limit }` says
the search spent its budget before reaching any complete assignment, which is a
statement about the budget rather than about the pair. `Build { source }` wraps
`BuildError::Network`, which wraps `CfnError::OverMemoryBudget` and names the
cost table entries, the bytes they come to, and the budget they were checked
against. No domain size refuses a search any more, so a wide record type or a
line-per-vertex parse poses like anything else; what is refused is measured
memory, and `SpanSearch::with_budget` moves the figure.

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

- [Rust SDK reference](https://panproto.dev/book/reference/sdk-rust.html)
- [Your first migration](https://panproto.dev/book/tutorials/your-first-migration.html)
- [Find a span between two schemas](https://panproto.dev/book/how-to/spans.html)
- [How the morphism search works](https://panproto.dev/book/explanation/morphism-search.html)
- [panproto-core on docs.rs](https://docs.rs/panproto-core)
