---
name: use-lenses
description: >
  Work with bidirectional lenses in panproto. Covers get/put operations, complement
  tracking, Cambria-style combinators, round-trip law verification, and auto-generation.
---

# Working with Lenses

You are helping a user work with panproto's bidirectional lens system. A lens is a pair of functions (`get`, `put`) between two schema versions that preserves data through round-trips.

## Core concepts

### What is a lens?

A lens between schemas S and T provides:
- **get(s)**: project an S-instance down to a T-instance, capturing a **complement** (the data that was dropped)
- **put(t', c)**: restore a T-instance back to an S-instance using the complement

The complement is the key innovation: it stores everything `get` discarded, so `put` can reconstruct the original without data loss.

### Lens laws

A valid lens satisfies two laws:
- **GetPut**: `put(get(s), complement(s)) = s` (round-trip through get then put recovers the original)
- **PutGet**: `get(put(t', c)) = t'` (round-trip through put then get recovers the modification)

## Step 1: Generate a lens

### Automatic generation (recommended)

**CLI:**
```bash
schema lens generate old.json new.json --protocol atproto --save lens.json
# Without --save the report goes to stdout; add --json or --chain to change the shape
```

**TypeScript:**
```typescript
const chain = p.protolensChain(oldSchema, newSchema);
const lens = chain.instantiate(schema);   // a ProtolensChainHandle is not itself runnable
```

**Python:**
```python
lens, quality, coerce_proposals = panproto.auto_generate_lens(old_schema, new_schema, proto)
# quality is the alignment score in [0, 1]; coerce_proposals is empty below "exploratory"
```

**Rust:**
```rust
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&old_schema, &new_schema, &protocol, &config)?;
let lens = result.lens;
```

None of these answers when the two schemas share only part of their structure, which on real pairs is the ordinary case. `Panproto.span` / `panproto.find_span` do; see [The span, when no lens exists](#the-span-when-no-lens-exists-0710) below.

### Hint-guided generation (0.26.0+)

When auto-generation is ambiguous (e.g., multiple possible field mappings), provide hints to guide the morphism search:

**CLI:**
```bash
schema lens generate old.json new.json --protocol atproto --hints hints.json
```

Where `hints.json` is a `HintSpec`:
```json
{
  "anchors": { "post": "article", "post:body": "article:content" },
  "constraints": [
    { "type": "scope", "under": "post:body", "targets": "article:content" },
    { "type": "exclude_targets", "vertices": ["article:legacy"] },
    { "type": "prefer", "predicate": { "kind": "similar_name", "threshold": 0.6 }, "weight": 2.0 }
  ]
}
```

**Anchors** seed the morphism search with known vertex correspondences. Forward-chaining constraint propagation derives additional anchors along unique edge-name matches.

**Constraints** restrict or reweight the search:
- `scope`: restrict search to vertices under a given parent pair
- `exclude_targets`: remove target vertices from every source's domain
- `exclude_sources`: force a source vertex out of the answer. It is a statement about the apex, not about the variable set, so a total-morphism search that excludes any source returns empty; the span search is what answers an excluded-source request
- `prefer`: adjust the objective's component weights (same edge names, similar names, same kinds). Since 0.71.0 the `similar_name` threshold is only a weight and no longer also cuts targets out of a domain: a candidate scoring below it is still searched, just scored lower

**TypeScript:**
```typescript
const chain = ProtolensChainHandle.autoGenerateWithHintSpec(oldSchema, newSchema, {
  anchors: { post: 'article' },
  constraints: [{ type: 'scope', under: 'post:body', targets: 'article:content' }],
}, wasm);
```

`ProtolensChainHandle.autoGenerateWithHints(src, tgt, anchors, wasm, stringency?)` is the shorter form when all you have is anchor pairs.

**Python:**
```python
chain = panproto.ProtolensChain.auto_generate_with_hints(
    old_schema, new_schema, proto,
    hints={"post": "article", "post:body": "article:content"}
)
```

### Stringency tiers (0.33.0+)

Auto-generation is parameterized by a `Stringency` axis that controls which alignment strategies and coercion witnesses the search may use. Each tier enables a superset of the tier below, with two measured exceptions (0.71.0): `wl_refinement` takes an iteration count rather than a threshold from the tier, and a third round of colour refinement can separate a pair the second round matched; `neighborhood` propagates from a one-to-one selection over the pool assembled so far, so a larger pool can give a source vertex a different seed and withdraw everything that propagated from the old one. Every other strategy takes a threshold, so raising the tier only lowers a bar and its output can only grow.

| Tier | Strategies enabled | When to use |
|------|---------------------|-------------|
| `Strict` | exact name+kind only | Same-name refactors, zero surprises |
| `Balanced` | + alias clusters, tokenized similarity | Default; real-world renames (`createdAt ≡ timestamp`) |
| `Lenient` | + wrap/unwrap detection, type-signature overlap, `DropSort`/`AddSort` span search | Cross-protocol (ATProto → GraphQL), heterogeneous migrations |
| `Exploratory` | + structural priors | Last-resort; inspect candidates manually |

**CLI:**
```bash
schema lens generate old.json new.json --protocol atproto \
  --stringency balanced --top-n 5 --explain
# Outputs ranked candidates with per-step confidences and a human-readable explanation.
```

**Python:**
```python
lens, quality, coerce_proposals = panproto.auto_generate_lens(
    old_schema, new_schema, proto, stringency="lenient"
)
candidates = panproto.auto_generate_lens_candidates(
    old_schema, new_schema, proto, top_n=5, stringency="balanced"
)
for cand in candidates:
    # each candidate is a dict, not an object
    print(cand["quality"], cand["coverage"], cand["score"], cand["strategies_used"])
    for step in cand["steps"]:
        print(" ", step["kind"], step["strategy"], step["confidence"], step["explanation"])
```

**TypeScript:**
```typescript
const { candidates, coerce_proposals } = ProtolensChainHandle.autoGenerateCandidates(
  srcHandle, tgtHandle, 5, wasm, 'balanced',
);
```

Candidates are ranked by `quality + 0.5·coverage + 0.2·avg_step_confidence` with deterministic tie-breaks. Each carries its `StrategyTag` provenance (exact, alias, token_similarity, wrap_unwrap, type_signature, structural) so you can see *why* the search proposed each mapping.

At a span tier (`lenient` and above) the candidate list now comes from the span search rather than from the total-morphism search (0.71.0). Before that fix both candidate entry points reported "no morphism found between schemas" on exactly the pairs a span tier exists for, since no total morphism exists whenever the source carries a sort the target lacks. Each optimal span contributes its right leg, and a span whose apex is empty is discarded.

### Sort coercions

At `Lenient+`, auto-generation can emit sort coercion witnesses for value conversions (Int/Float/Str/Bool pairs). Each coercion carries a `CoercionClass` (`Iso`, `Retraction`, `Projection`, `Opaque`) and is validated against the enclosing theory's naturality conditions. When a candidate proposes a coercion that isn't in the built-in `WitnessLibrary`, the output emits a `CoerceProposal` rather than silently dropping the mapping, so you can decide whether to supply a custom witness.

Coercion class declarations are promises about round-trip behavior. Before generating a lens, run the sample-based law checker on the theory to catch dishonest `Iso` or `Retraction` declarations:

```bash
schema theory check-coercion-laws theory.ncl --json
```

See `/panproto-coercion-law-checks` for the full CI gate. The library API (`panproto_lens::coercion_laws::check_theory`) is also wired into `AutoLensConfig.coercion_law_registry` (0.38.0+) so auto-generation can filter dishonest coerce anchors out of the CSP search space before they become migration candidates:

```rust
let config = panproto_lens::AutoLensConfig {
    coercion_law_registry: Some(
        panproto_lens::coercion_laws::CoercionSampleRegistry::with_defaults(),
    ),
    ..Default::default()
};
```

### Only the objective decides what is dropped (0.71.0)

Auto-generation used to pre-populate `excluded_sources` from three local feasibility scans before the search ran, on the theory that a vertex with no compatible target should be dropped early. Those scans are gone. They were stricter than the search they were meant to help: a root whose only outgoing edge had no target counterpart was excluded along with the orphan leaf, so the generated chain carried a `DropSort` for a record the search would have kept. The span search answers the same question exactly, against the whole objective rather than a local scan, so a source vertex is now dropped only where dropping it is cheaper than keeping it. Fields that used to disappear at a span tier survive.

The other half of the same repair: a strategy anchor no longer costs coverage the unpinned search would have had. Alignment-strategy output is merged into `SearchOptions::hard_pins`, and a pin collapses its vertex's domain, so a pin that is individually plausible but jointly infeasible with the rest left the vertex unmappable and the field simply missing from the lens, under a proven-optimal certificate. Both the single-result and the candidate entry points now run the released search alongside the pinned one, and they read the result differently. `auto_generate` and `auto_generate_with_hints` compare the two on the objective, quality first with coverage as the tie-break, and keep the pinned answer only where the two tie exactly. Releasing a pin can only widen the feasible set, so the released optimum is never worse, and comparing on coverage alone kept the worse answer on 66 of the corpus's 5852 pairs, forgoing a median 0.0012 quality and as much as 0.3251. The candidate entry points still compare best coverage, and skip the released search entirely when the pinned list already covers the whole source.

### Optic classification

Auto-generation classifies the transform by its `OpticKind`:

| `OpticKind` | Meaning | Complement |
|---------------|---------|------------|
| `Iso` | Bijective, and every value transform is itself lossless | Terminal; `put_without_complement` is available |
| `Lens` | Target is a projection of the source (data dropped) | Stores the dropped data |
| `Prism` | Source injects into the target as one variant | Stores the variant tag |
| `Affine` | A `Lens` composed with a `Prism` | Stores the tag and the dropped data |
| `Traversal` | Multi-focus, e.g. a transform under an `item` edge | Tracks positions |

**Iso requires more than a structural bijection (0.60.0+).** `optic_kind` used to return `Iso` whenever the schema mapping was a structural bijection (every vertex and edge survives, no variant changes), ignoring the value transforms the migration carries. It now returns `Iso` only when both hold: the schema map is bijective **and** the composite of every value transform is itself lossless (`CoercionClass::Iso`). A structurally-bijective migration that carries a lossy value transform (a `compute_field`, or a scalar coercion classified `Retraction`, `Projection`, or `Opaque`) is now classified `Lens`, not `Iso`, since its value-level action does not round-trip without the complement.

## Step 2: Use get/put

### Forward (get): project data from old to new schema

**CLI:**
```bash
schema lens apply lens.json record.json --protocol atproto --direction forward
# Outputs: { "view": {...}, "complement": {...} }
```

**TypeScript:**
```typescript
const lens = chain.instantiate(schema);          // ProtolensChainHandle -> LensHandle
const { view, complement } = lens.get(record);   // record: MessagePack bytes
// view: the record projected to the new schema
// complement: data discarded during projection

// Or, straight to and from JSON, rooted at a named vertex (0.66.0+):
const json = lens.getJson(record, 'app.bsky.feed.post:body');
```

**Python:**
```python
view, complement = lens.get(instance)
```

**Rust:**
```rust
let (view, complement) = panproto_lens::get(&lens, &instance)?;
```

### Backward (put): restore data from new to old schema

**CLI:**
```bash
schema lens apply lens.json modified-view.json --protocol atproto \
  --direction backward --complement complement.json
```

**TypeScript:**
```typescript
const restored = lens.put(modifiedView, complement);
```

**Python:**
```python
restored = lens.put(modified_view, complement)
```

**Rust:**
```rust
let restored = panproto_lens::put(&lens, &modified_view, &complement)?;
```

`put` refuses a complement it cannot have produced (0.68.0+). Passing an empty complement used to return an empty record; it now errors, since a reconstructed empty record and the total loss of a populated one are indistinguishable to the caller.

### Backward from a view alone (0.68.0+)

A record read back from storage carries no complement, so `put` has nothing to consume. `put_without_complement` covers that case exactly as far as it can be covered: a lens with complement decomposes its source as `S ≅ V × C`, so a view determines its source precisely when `C ≅ 1`, which is what `Lens::is_isomorphism` decides statically. Every source vertex must survive, every edge must survive up to renaming, and the composite coercion class must be `Iso`.

**Rust:**
```rust
if let Some(reason) = lens.obstruction_to_isomorphism() {
    eprintln!("cannot reconstruct from a view alone: {reason}");
} else {
    let source = panproto_lens::put_without_complement(&lens, &stored_view)?;
}
```

**TypeScript (0.69.0+):**
```typescript
if (lens.isIsomorphism()) {
  const source = lens.putJsonWithoutComplement(storedView, 'app.bsky.feed.post:body');
} else {
  console.log(lens.isomorphismObstruction()); // the first failing condition
}
```

Availability is a property of the lens rather than of any record, so one check answers for every view that lens will produce and you can branch statically instead of catching a throw.

## Step 3: Compose lenses

Chain multiple lenses for multi-step migrations:

**CLI:**
```bash
schema lens compose v1-to-v2.json v2-to-v3.json --protocol atproto
# Outputs: v1-to-v3.json
```

**TypeScript:**
```typescript
const composed = p.composeLenses(v1ToV2, v2ToV3);   // both are LensHandles
```

**Python:**
```python
composed = v1_to_v2.compose(v2_to_v3)   # a method on Lens, not a module function
```

Composition is functorial on value-level field transforms (0.66.0+): a second lens's expression variables are rewritten along the inverse of the first lens's edge renames, simultaneously, so a swap `{a → b, b → a}` does not collapse. Reading a field the first lens takes away is reported as `LensError::ComposeUnboundField` at composition time rather than as an unbound variable far from its cause.

## Step 4: Verify lens laws

Always verify on representative test data:

**CLI:**
```bash
schema lens verify test-data.json --protocol atproto schema.json
```

**TypeScript:**
```typescript
const result = lens.checkLaws(instanceBytes);  // LawCheckResult
console.log(result.holds);      // true/false
console.log(result.violation);  // the message, or null
// lens.checkGetPut(...) / lens.checkPutGet(...) test one law each
```

**Python:**
```python
lens.check_laws(test_instance)      # raises LensError on violation, returns None otherwise
lens.check_get_put(test_instance)
lens.check_put_get(test_instance)
```

### Laws on a compiled migration (0.67.0+)

The law checks live on `Lens`, and for a long time the only Python routes to a `Lens` were the two that search for a schema morphism, which does not scale to a schema of realistic size. A lens *is* a compiled migration together with the two schemas it runs between, so `CompiledMigration` now carries the whole set, with no search involved:

```python
compiled = panproto.compile_migration(migration, old_schema, new_schema)
view, complement = compiled.get(instance)   # complement is a Complement object
restored = compiled.put(view, complement)
compiled.check_laws(instance)               # or check_get_put / check_put_get
lens = compiled.to_lens()                   # cannot fail
```

`CompiledMigration.get`'s second return value is a `Complement`, not a summary dict (0.67.0): code reading `complement["dropped_node_count"]` reads `complement.dropped_node_count`. The counts are unchanged; the object now carries everything `put` needs rather than a summary of it.

`PutGet` is checked modulo derived components (0.66.0+). A view coordinate that a transform materializes (`ComputeField`, `AddField`, `ApplyExpr`, and those reached through `PathTransform` or `Case`) is pinned by the independent ones, so a view edited without re-deriving it is outside the image of `get` and the law cannot be checked strictly against it. `GetPut` stays strict, since its view argument is `get(s)` and is consistent by construction.

## Step 5: Cambria-style combinators (manual lens construction)

For cases where auto-generation is insufficient, build a chain from atomic combinators:

| Combinator | What it does |
|-----------|-------------|
| `renameField(parent, old, new)` | Rename a field (vertex name and JSON key) |
| `addField(parent, name, kind)` | Add a field |
| `removeField(name)` | Remove a field (stored in complement) |
| `nestField(parent, child, intermediate, kind, options?)` | Nest a field under a new intermediate vertex |
| `hoistField(parent, intermediate, child)` | Unnest a field, collapsing the intermediate |
| `renameEdgeName(srcSort, tgtSort, old, new)` | Rename a JSON key without touching the sorts |
| `mapItems(focus, inner)` | Apply an inner step to each element of an array |

**TypeScript** (`PipelineBuilder` takes the WASM module and returns a `ProtolensChainHandle`):
```typescript
import { PipelineBuilder } from '@panproto/core';

const chain = new PipelineBuilder(wasm)
  .renameField('profile', 'name', 'displayName')
  .addField('profile', 'bio', 'string')
  .removeField('legacyId')
  .build();

const lens = chain.instantiate(schema);
```

**CLI:** there is no combinator-literal file format. Author the chain as a lens document (below), compile it with `schema lens compile doc.yaml --body-vertex app.bsky.actor.profile:body`, and apply the resulting chain JSON:
```bash
schema lens compile lens.yaml --out chain.json
schema lens apply chain.json record.json --protocol atproto --direction forward
```

## Declarative lens files (v0.25.0+)

For lenses that should be **loadable data** (version-controlled, reviewed in PRs, composed from reusable fragments), use the declarative DSL (`panproto-lens-dsl`). Write lens specs in Nickel, JSON, or YAML:

```nickel
let L = import "panproto/lens.ncl" in
{
  id = "my.lens.v1",
  source = "my.source",
  target = "my.target",
  steps = [
    L.remove "legacyId",
    L.rename "name" "displayName",
    L.add "bio" "string" "",
  ],
} | L.Lens
```

See `/lens-dsl` for the full DSL reference.

### Compiling a lens document from TypeScript/JavaScript (0.59.0+)

From the SDK, compile a lens document with `compileLensDocument(source, bodyVertex)`, then `instantiate(schema)` to get a `LensHandle`:

```typescript
const chain = pp.compileLensDocument({
  id: 'demo.regroup',
  source: 'v1', target: 'v2',
  steps: [{ compute_field: { target: 'fullName', expr: 'concat firstName " " lastName' } }],
}, 'app.bsky.feed.post:body');

const lens = chain.instantiate(schema);
const { view, complement } = lens.get(record); // computes fullName
```

A lens document's value-level steps (`apply_expr`, `compute_field`, `hoist_field`, `nest_field`) used to be discarded at the WASM boundary, so a JS caller could author only structural lenses (rename/drop/etc.): a document whose substantive step computed a field or regrouped flat fields into a nested object compiled to an empty chain and `get` returned its input untouched. `compileLensDocument` now carries the value transforms through, `instantiate().get()` evaluates them and `put()` inverts them. They do **not** appear in `toJson()`; call `chain.fieldTransforms()` (returns `Record<string, unknown[]>`, keyed by parent vertex) to list them and confirm such a step survived compilation.

## The span, when no lens exists (0.71.0)

`p.lens`, `p.protolensChain` and `auto_generate_lens` all refuse when no alignment is found, and on the measured schema corpus most real pairs admit no total morphism at all: one sort the target lacks is enough. The span search answers instead of refusing. It returns `src ←ℓ─ A ─r→ tgt`, where the apex `A` is the sub-schema of the source induced on the vertices that got a target, so two schemas with nothing in common come back as an empty apex with `apex_coverage` zero rather than as an exception.

**TypeScript:**
```typescript
const span = p.span(oldSchema, newSchema);       // optional third argument: known anchors
console.log(span.apex_vertices, span.apex_coverage, span.quality, span.quality_bounds);
if (span.is_total) {
  // the span covers the whole source, which is what a total morphism would have given
}
// span.apex_digest is a stable identifier you can key a cache on
```

The response is plain data: the apex arrives as its vertex and edge sets rather than as a handle, so there is nothing to dispose. `ProtolensChainHandle.autoGenerateSpan(src, tgt, wasm, hints?)` is the same call one level down.

**Python:**
```python
span = panproto.find_span(old_schema, new_schema, proto)   # anchors=, monic=, iso= optional
print(span.apex_coverage, span.quality, span.quality_bounds, span.proven_optimal)
morphism = span.as_total_morphism()   # None unless the span covers the whole source
overlap = span.to_overlap()           # the pair lists a pushout takes
```

**Rust:**
```rust
use panproto_mig::hom_search::{SearchOptions, find_span};

let span = find_span(&old_schema, &new_schema, &protocol, &SearchOptions::default())?;
```

`protocol` is a parameter because the apex is itself a schema, and a schema is well formed only against a protocol: inducing the apex re-validates it rather than assuming it.

Three things the span carries that a bare morphism did not:

1. `quality` ranks how well the covered part matches, and `apex_coverage` separately says how much was covered. Read both. `quality` is a ranking signal among spans over **one** source schema and has no absolute reading across pairs, since every denominator of the objective is fixed by the source.
2. `quality_bounds` brackets the quality. The two ends are equal exactly when `proven_optimal` holds; when it does not, the interval separates "0.4, and nothing better exists" from "0.4, and the search ran out of budget before it could rule out 0.9".
3. The certificate records what the construction proved: whether the optimum was proven, what shape each leg is, whether both are functorial, what the existence check reported **on each leg separately** (`left_existence` and `right_existence`, since the two legs have different codomains and can fail different obligations), whether the apex has an entry point, the apex digest, the solver path, and the tie-break order.

`SchemaSpan::pushout(src, tgt)` merges the two schemas along the apex, and refuses with `SpanError::ContractingRightLeg` when the right leg sends two apex vertices to one target vertex: the square that would come back is not a cocone over the span it was asked about. A contracting right leg is an ordinary answer from the default search, so this is a precondition to meet rather than an impossibility; pass `iso` (or `monic`) to rule it out.

### The total-morphism entry points, and what they now report

`find_morphisms` no longer enumerates the hom-set. It returns the morphisms **attaining** the optimum, so every element carries the same quality and a caller reading element zero gets what it always got. A caller walking the list for a suboptimal alternative will not find one. It returns a `MorphismList`, whose `truncated` flag says whether the result cap (1024) bound the enumeration: a list of 1024 with the flag clear is a statement about the pair, and the same list with the flag set says only that the pair has at least that many optima.

All four total-morphism entry points now return `Result`. `Ok([])` and `Ok(None)` mean no total morphism exists and only that; a search that could not be posed, or that spent its budget before reaching any complete assignment (`SpanError::Stopped`), is reported rather than laundered into an empty answer. A schema searched against itself used to be told its identity morphism did not exist.

`epic` is a constraint the search enforces rather than a filter over its answer, so `find_morphisms(epic: true)` returns a surjective total morphism whenever one exists. `find_span` rejects the flag with `SpanError::EpicIsNotASpanProperty`, because a span's right leg is deliberately partial and the entry point is documented never to refuse for want of a match.

These `SearchOptions` fields are gone: `preferred` (soft evidence is now a unary cost, which changes which assignment is optimal rather than which optimum is found first), `max_nodes` (moved to `SearchBudget`, where exhausting it is reported rather than silently absorbed), and `relax_edge_name_pruning` (edge-name agreement already enters the objective). `initial` is now `hard_pins`, named for what it does: a hard restriction the search may not reconsider, not a starting point it may move away from. `DomainConstraints::name_similarity_threshold` is gone, and `DomainConstraints::scoring_weights` takes a `CostWeights` rather than a bare `[f64; 4]`, so an all-zero or negative vector is rejected at construction and the score stays inside `[0, 1]`.

## Further Reading

- [Tutorial Ch. 6: Bidirectional Migration with Lenses](https://panproto.dev/tutorial/chapters/06-bidirectional-migration-with-lenses.html)
- [Tutorial Ch. 16: Protolenses](https://panproto.dev/tutorial/chapters/16-protolenses.html)
- [Tutorial Ch. 17: Automatic Lens Generation](https://panproto.dev/tutorial/chapters/17-automatic-lens-generation.html)
- [Tutorial Ch. 18c: Declarative Lens Specifications](https://panproto.dev/tutorial/chapters/18c-declarative-lens-specifications.html)
