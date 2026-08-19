---
name: lens-dsl
description: >
  Write declarative lens specifications using Nickel, JSON, or YAML. Covers the
  panproto-lens-dsl crate: step types, rule-based rewrites, composition, Nickel
  contracts, parameterized templates, and the evaluation/compilation pipeline.
---

# Declarative Lens DSL

You are helping a user write or work with declarative lens specifications using `panproto-lens-dsl`. This crate compiles Nickel (`.ncl`), JSON, or YAML lens files into `ProtolensChain` + `FieldTransform` objects.

## When to use the DSL vs. programmatic lenses

Use the DSL when lenses should be **loadable data**: stored alongside schemas, version-controlled, reviewed in PRs, composed from reusable fragments, or authored by non-programmers. Use programmatic lenses (Rust/TypeScript/Python APIs) when lenses are tightly coupled to application logic.

## Surface syntax options

| Format | Best for | Composition |
|--------|----------|-------------|
| **Nickel** (`.ncl`) | Complex lenses with composition, templates, validation | Record merge (`&`), functions, imports, typed contracts |
| **JSON** (`.json`) | Simple lenses, CI pipelines, generated output | None (flat files) |
| **YAML** (`.yaml`) | Human-authored simple lenses | None (flat files) |

Nickel is the recommended authoring format for anything beyond trivial lenses.

## Nickel quickstart

```nickel
let L = import "panproto/lens.ncl" in

{
  id = "my.lens.v1",
  source = "my.source.schema",
  target = "my.target.schema",
  steps = [
    L.remove "legacyField",
    L.rename "oldName" "newName",
    L.add "newField" "string" "default_value",
    L.add_computed "derived" "string" "" 'concat firstName " " lastName',
  ],
} | L.Lens
```

### Composition via record merge

```nickel
let L = import "panproto/lens.ncl" in
let base = import "base.ncl" in
let extras = import "extras.ncl" in

base & extras & {
  id = "composed.v1",
  source = "my.source",
  target = "my.target",
} | L.Lens
```

### Parameterized templates

```nickel
let L = import "panproto/lens.ncl" in

# Reusable: generate counter fields
let counters = fun fields =>
  fields |> std.array.map (fun f => L.add f "integer" 0)
in

{ steps = counters ["stars", "forks", "issues"] }
```

## Step types (all 19)

### Field combinators
- `L.remove "field"` : drop a field (Lens optic)
- `L.rename "old" "new"` : rename a field's JSON key (Iso optic)
- `L.add "name" "kind" default` : add a field with default (Lens optic)
- `L.add_computed "name" "kind" default "expr"` : add + compute value

### Value-level transforms
- `L.apply "field" "expr"` : transform an existing field's value
- `L.apply_invertible "field" "expr" "inverse_expr"` : with round-trip inverse
- `L.compute "target" "expr"` : compute a new field from the parent fiber
- `L.compute_invertible "target" "expr" "inverse"` : with inverse

These value-level steps (and the structural `L.hoist` / `L.nest` below) compile to *field transforms* rather than to structural chain steps. Before 0.59.0 the WASM boundary discarded that half, so a document whose substantive step computed a field or regrouped flat fields into a nested object compiled to an empty chain from the TypeScript/JavaScript SDK and `get` returned its input untouched. They now compile through and apply. Note that folding a value transform into an otherwise structurally-bijective migration means it no longer classifies as an `Iso` optic unless the transform is itself lossless (`CoercionClass::Iso`); a lossy transform makes the composite a `Lens` (0.60.0+).

### Structural combinators
- `L.hoist "parent" "intermediate" "child"` : flatten nesting
- `L.nest "parent" "child" "wrapper" "kind" "edge"` : add nesting
- `L.map_items "focus" [inner_steps]` : apply to each array element (Traversal)

### Theory operations
- `L.pullback "name" "domain" "codomain" sort_map op_map`
- `L.coerce "sort" "target_kind" "expr" coercion_class`
- `L.coerce_invertible "sort" "target_kind" "expr" "inverse"`
- `L.merge "sort_a" "sort_b" "merged" "merger_expr"`
- `L.add_sort "name" "kind" default` / `L.drop_sort "name"` / `L.rename_sort "old" "new"`
- `L.add_op "name" "src" "tgt" "kind"` / `L.drop_op "name"` / `L.rename_op "old" "new"`
- `L.add_equation "name" "lhs" "rhs"` / `L.drop_equation "name"`

## Rule-based lenses

For name-mapping between schema dialects:

```yaml
id: my.name.mapping.v1
source: format.a.facet
target: format.b.facet
rules:
  - match: { name: bold }
    replace: { name: strong }
  - match: { name: link }
    replace:
      name: a
      rename_attrs: { url: href }
  - match: { name: unused }
    replace: null
passthrough: keep
```

Supported rule operations: `rename_attrs`, `drop_attrs`, `add_attrs`, `keep_attrs`, `map_attr_value` (with ops: add, subtract, multiply, prefix, suffix, negate, to-string, to-number, to-boolean).

## Composition of lens documents

```json
{
  "id": "composed.v1",
  "source": "a",
  "target": "c",
  "compose": {
    "mode": "vertical",
    "lenses": [
      { "ref": "a.to.b.v1" },
      { "ref": "b.to.c.v1" }
    ]
  }
}
```

Modes: `vertical` (sequential pipeline) or `horizontal` (endofunctor composition: each chain fused, then `protolens_horizontal` applied).

## Loading and compiling (Rust)

```rust
use panproto_lens_dsl::{load, compile};

let doc = load(Path::new("my_lens.ncl"))?;
let compiled = compile(&doc, "record:body", &|id| resolve_lens(id))?;
// compiled.chain: ProtolensChain
// compiled.field_transforms: HashMap<Name, Vec<FieldTransform>>
// compiled.auto_spec: Option<AutoSpec> (if auto body variant)
```

## Loading and compiling (TypeScript/JavaScript, 0.59.0+)

```typescript
// source: a JS object, JSON/YAML string, or bytes; bodyVertex: parent for field-level steps
const chain = pp.compileLensDocument(doc, 'app.bsky.feed.post:body' /*, 'yaml' */);
const lens = chain.instantiate(schema);       // -> LensHandle
const { view, complement } = lens.get(record); // value transforms run here
```

`compileLensDocument` now carries the compiled field transforms through the WASM boundary, so value-level and hoist/nest steps take effect on `get`/`put`. They do not appear in `chain.toJson()`; call `chain.fieldTransforms()` (returns `Record<string, unknown[]>` keyed by parent vertex) to list them. Nickel source is not accepted directly, because its contract imports need a filesystem; precompile Nickel to JSON on the host and pass that.

## Expressions

All `expr` fields use the panproto expression language (Haskell-style syntax). See `/expression-language` for the full reference. Common patterns:

```
concat firstName " " lastName
head (split (replace uri "at://" "") "/")
case status of "active" -> True | _ -> False
upper (trim name)
```

## Extension metadata

Protocol-specific metadata goes under `extensions`:

```yaml
extensions:
  db_projection:
    table: repos
    row_struct: RepoRow
    conflict_keys: [did, name]
```

The DSL compiler passes extensions through unchanged; downstream consumers extract what they need.

## HintSpec for guided auto-generation (0.26.0+)

When using the `auto` body variant, you can provide a `HintSpec` to guide morphism search:

### JSON
```json
{
  "id": "my.auto.lens.v1",
  "source": "my.source",
  "target": "my.target",
  "auto": {
    "quality_threshold": 0.5,
    "max_results": 4,
    "hints": {
      "anchors": { "post": "article", "post:body": "article:content" },
      "constraints": [
        { "type": "scope", "under": "post:body", "targets": "article:content" },
        { "type": "exclude_targets", "vertices": ["article:legacy"] },
        { "type": "exclude_sources", "vertices": ["post:deprecated"] },
        { "type": "prefer", "predicate": { "kind": "similar_name", "threshold": 0.6 }, "weight": 2.0 },
        { "type": "prefer", "predicate": { "kind": "same_edge_name" }, "weight": 1.5 },
        { "type": "prefer", "predicate": { "kind": "same_kind" }, "weight": 1.0 }
      ]
    }
  }
}
```

### Nickel
```nickel
let L = import "panproto/lens.ncl" in
{
  id = "my.auto.lens.v1",
  source = "my.source",
  target = "my.target",
  auto = {
    quality_threshold = 0.5,
    max_results = 4,
    hints = {
      anchors = { post = "article", "post:body" = "article:content" },
      constraints = [
        L.scope "post:body" "article:content",
        L.exclude_targets ["article:legacy"],
        L.prefer_similar_name 0.6 2.0,
        L.prefer_same_edge_name 1.5,
      ],
    },
  },
} | L.Lens
```

### The `auto` body's own keys

| Key | Effect |
|-----|--------|
| `quality_threshold` | Minimum alignment quality to accept, in `[0, 1]` |
| `enable_overlap` | Try overlap-based alignment when the direct morphism search fails |
| `max_results` | How many optimal morphisms the search may return. Renamed from `max_search_depth` in 0.71.0: the field has always set `SearchOptions::max_results`, and the search is now an exact optimiser, so what it caps is the number of morphisms *attaining* the optimum rather than how far the search looks. Zero is read as one, since a document asking for no results is asking for no lens. The Nickel contract carries the new key under the same optionality |
| `hints` | The `HintSpec` below |

### Constraint types

| Type | Fields | Effect |
|------|--------|--------|
| `scope` | `under`, `targets` | Restrict search to vertices reachable from this parent pair |
| `exclude_targets` | `vertices` | Remove target vertices from every source's domain |
| `exclude_sources` | `vertices` | Force a source vertex out of the answer |
| `prefer` | `predicate`, `weight` | Set the objective's component weights: `same_edge_name`, `similar_name { threshold }`, `same_kind`. Weights are normalized to sum to one, so only their ratios matter |

Two of these read differently since 0.71.0. `exclude_sources` forces `x_v = ⊥` rather than removing the variable, which keeps the variable set a function of the source schema alone; since a total morphism must map every source vertex, a total-morphism search with any exclusion returns empty and the span search is what answers the request. And `similar_name`'s `threshold` is now only the weight the objective puts on its name component, never a cut: a candidate scoring below it is still searched, just scored lower. It used to also remove every target whose name scored below it, over full path-like identifiers rather than the local names a reader would compare, which threw away correct answers whenever two schemas agreed on a field and disagreed on the prefix leading to it. State a genuine restriction as a `scope` or an exclusion, which say what they mean.

### Anchor propagation

Declared anchors are expanded by forward-chaining constraint propagation: if `(a, b)` is an anchor and both `a` and `b` have a unique outgoing edge with the same name leading to children with the same vertex kind, the children are added as derived anchors. This repeats to fixpoint.
