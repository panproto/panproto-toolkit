---
name: build-migration
description: >
  Build a schema migration between two versions. Covers writing migration morphisms,
  existence checking, compilation, and lifting records. Use /build-migration to start.
---

# Building Migrations

You are helping a user build a schema migration. A migration is a structure-preserving map (morphism) from a source schema to a target schema.

## Step 1: Understand the two schemas

Ask the user for:
1. The source schema (old version)
2. The target schema (new version)

Read both schemas to understand what changed. If the user has schema files, diff them:
```bash
schema diff old.json new.json
```

Both operands are positional. Each goes through a shared loader (0.70.1+) that accepts panproto's own serialized schema, a manifest-backed project directory (parsed as one bundle, so cross-document references resolve), a single schema document, or a source tree. Comparing two versions of a lexicon project is therefore an ordinary `schema diff`; before 0.70.1 both operands were deserialized directly as panproto's internal JSON and nothing else was accepted.

## Step 2: Choose an approach

There are three ways to build a migration:

### A. Automatic (recommended for simple changes)

Let panproto discover the migration automatically:

**CLI:**
```bash
schema auto-migrate old.json new.json
```

The command runs the span search, which never refuses (0.71.0). The human report prints the apex size, the fraction of the source it covers, and the interval the search proved the quality lies in. Three flags form a strictness ladder over that one search:

| Flag | Accepts |
|------|---------|
| `--total` | Only a span covering every source vertex. On a partial answer it falls back to the total-morphism search, which answers the existence question the flag actually asks, and reports what it finds |
| *(default)* | Any span covering at least one source vertex |
| `--span` | An empty apex, as the answer that the two schemas share nothing |

`--monic` is orthogonal to all three and asks for an injective vertex map. `--json` writes the span's **right leg**, a migration out of the apex rather than out of the source, so its declared domain is the apex digest. The command resolves the source schema's protocol, because the apex is itself a schema and a schema is well formed only against one; a schema naming a protocol the CLI does not carry is refused where it used to be searched.

When the answer identifies two source vertices, the command says so on stderr (which keeps stdout pipeable under `--json`). That is not a migration a lift can carry out: both fields' data would arrive under the survivor's name.

To generate a lens or chain rather than a migration:

```bash
schema lens generate old.json new.json --protocol atproto
```

**TypeScript:**
```typescript
const chain = p.protolensChain(oldSchema, newSchema);   // throws when no alignment is found
const span = p.span(oldSchema, newSchema);              // always answers
```

**Python:**
```python
lens, quality, coerce_proposals = panproto.auto_generate_lens(old_schema, new_schema, proto)
span = panproto.find_span(old_schema, new_schema, proto)
```

**Rust:**
```rust
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&old_schema, &new_schema, &protocol, &config)?;
```

Auto-generation works well for: field renames, field additions with defaults, field removals, type coercions, and simple structural rearrangements.

The auto-lens pipeline runs anchors through 14 alignment strategies (in priority order: `user_hint`, `exact`, `exact_suffix`, `edge_label`, `alias`, `token_similarity`, `description_similarity`, `type_signature`, `wrap_unwrap`, `coerce`, `neighborhood`, `wl_refinement`, `structural`, `llm`). The compiled migration record summarizes which strategies fired and at what confidence under `alignmentStrategies`; inspect it when an anchor surprises you. See `/panproto-migration-advisor` for the conflict-ranking ladder and per-strategy semantics.

### B. Hint-guided (for changes needing guidance) (0.26.0+)

Use auto-generation with a `HintSpec` JSON file to guide ambiguous cases:
```bash
schema lens generate old.json new.json --protocol atproto --hints hints.json
```

The hints file declares vertex anchors (known correspondences), scope constraints, exclusions, and scoring preferences:
```json
{
  "anchors": { "old_field": "new_field" },
  "constraints": [
    { "type": "scope", "under": "old_parent", "targets": "new_parent" },
    { "type": "prefer", "predicate": { "kind": "similar_name", "threshold": 0.6 }, "weight": 2.0 }
  ]
}
```

Forward-chaining constraint propagation derives additional anchors from the declared ones. Since 0.71.0 those anchors reach the search as a **cost**, never as a domain restriction: the solver chooses globally, subject to the hard constraints and the objective, rather than being handed a selection made for it in advance. That removes the failure where one high-confidence claim blocked a pair of moderate claims whose total was greater.

Anchor resolution is aggregate-then-select. `align::resolve_anchors`, a per-source argmax over raw confidences, is replaced by `align::evidence::aggregate`, which reduces the whole anchor pool to one score per `(source, target)` pair, and `EvidenceTable::select`, which chooses off the search path. Aggregation applies a provenance ceiling, then a priority band, then a `max` within each of six evidence families, then a fixed-arity mean across them; the fixed arity is what makes the score monotone in the pool. `Anchor` gains a `provenance` field, stamped by the emitting branch rather than derived from the strategy tag, because one strategy can emit from two branches reading two different inputs.

A `user_hint` anchor is exempt from the requiredness tiebreak (0.71.0). A hint stated at 1.0 across a schema change that made a field optional used to come back as 0.95, contradicting the documented behaviour that a hinted pair reads 1.0. A hint is a caller stating a correspondence, not a heuristic proposing one, so there is no tie for a tiebreak to settle.

The vertex mappings a caller states through `anchors` land in `SearchOptions::hard_pins`, which the search may not reconsider. An incompatible pin is not honoured: it leaves the vertex with `⊥` as its only value, which drops it from the apex rather than mapping an integer vertex onto a string one.

### C. Manual morphism (for complex transformations)

Define the vertex and edge maps explicitly. A migration morphism specifies:
- `vertex_map`: which source vertices map to which target vertices
- `edge_map`: which source edges map to which target edges

**CLI:**
```bash
# Write a migration file
cat > migration.json << 'EOF'
{
  "vertex_map": {
    "post:body.text": "post:content.text",
    "post:body.createdAt": "post:content.createdAt"
  },
  "edge_map": {
    "post:body->post:body.text": "post:content->post:content.text"
  }
}
EOF

schema check --src old.json --tgt new.json --mapping migration.json
```

## Step 3: Check existence conditions

Before compiling, verify the migration is valid:

**CLI:**
```bash
schema check --src old.json --tgt new.json --mapping migration.json
```

**TypeScript:**
```typescript
const report = p.checkExistence(oldSchema, newSchema, migrationBuilder);
if (!report.valid) {
  console.log(report.errors);   // each carries a `kind` and a `message`
}
```

**Python:**
```python
report = panproto.check_existence(migration, proto, old_schema, new_schema)
if not report["valid"]:
    print(report["errors"])
```

The report is a dict, and it always comes back: it never raises, so read `valid` rather than catching.

Existence conditions are derived from the protocol's theory, not hardcoded. Common issues:

| Condition | Meaning | Fix |
|-----------|---------|-----|
| Target vertex missing | A source vertex maps to a nonexistent target | Add the missing vertex or change the mapping |
| Arity mismatch | Edge endpoints do not match after mapping | Fix the vertex_map so edge endpoints align |
| Constraint incompatible | Target constraints are stricter than source | Relax target constraints or add a coercion |
| Reachability violation | Some target vertices are unreachable from root | Ensure the target graph is connected |

## Step 4: Compile

Compilation pre-computes remapping tables for fast per-record application:

**CLI:**
```bash
schema lift --migration migration.json \
  --src-schema old.json --tgt-schema new.json record.json
```

**TypeScript:**
```typescript
const compiled = p.migration(oldSchema, newSchema)   // a MigrationBuilder
  .map('post:body.text', 'post:content.text')
  .compile();
const result = compiled.lift(record);
```

**Python:**
```python
compiled = panproto.compile_migration(migration, old_schema, new_schema)
result = compiled.lift(record)
```

The migration is the first argument, not the last.

**Rust:**
```rust
let compiled = panproto_mig::compile(&old_schema, &new_schema, &migration)?;
let result = panproto_mig::lift_wtype(&compiled, &old_schema, &new_schema, &instance)?;
```

## Step 5: Apply to data

### Single record
```bash
schema lift --migration migration.json \
  --src-schema old.json --tgt-schema new.json record.json
```

### Batch (directory of records)

`schema data convert` takes the two schemas directly, so it works outside a repository:
```bash
schema data convert records/ --from old.json --to new.json --protocol atproto --output migrated/
```

### With version control
```bash
schema data migrate records/   # uses schema history to find the right migration
```

`data migrate` reads the migration off the commit DAG (`--range` picks a pair of commits, `parent..HEAD` by default), so it takes no schema arguments. `--backward` reverses it using the stored complements, `--dry-run` previews, and `--coverage` prints statistics.

## Declare coercions honestly (0.38.0+)

Migrations that cross kinds (e.g., `Int` to `Str`, `Float` to `Int`) rely on coercion witnesses declared as directed equations in the enclosing theory. Each equation carries a `CoercionClass`:

| Class | Use when |
|-------|---------|
| `Iso` | Forward and inverse are total inverses (e.g., `Int` to its string decimal and back) |
| `Retraction` | Forward is total; inverse recovers the forward image only (e.g., `Str::parse::<Int>` after `Int::to_string`) |
| `Projection` | Forward drops information (e.g., `Float` to `Int` by truncation) |
| `Opaque` | Documentation pair; no round-trip promise |

A dishonest `Iso` declaration corrupts the asymmetric-lens put law silently. Before shipping a migration that uses coercions, run the sample-based law checker:

```bash
schema theory check-coercion-laws theory.ncl --json
```

Exit code is non-zero on any falsifying sample. See `/panproto-coercion-law-checks` for the full gate, violation kinds, and GitHub Actions wiring. Opt into `AutoLensConfig.coercion_law_registry` (with `FilterOptions::with_unknown(UnknownSamplesPolicy::Drop)` for the strictest gate) to filter dishonest coerce anchors out of the CSP search space during auto-generation.

Service-mediated callers can drive the same checker through the `dev.panproto.translate.verifyCoercionLaws` lexicon (0.39.0+), which takes `class`, `forwardExpr`, `inverseExpr`, `varName`, `valueKind`, optional `samples`, and an optional `#filterOptions` block, returning `sampleCount` plus a list of `#coercionLawViolation` records.

## What the morphism search now reports (0.71.0)

Three contract changes bite on any code that drove the search directly.

1. **The span is the primary result.** `find_span(src, tgt, protocol, opts)` returns `src ←ℓ─ A ─r→ tgt` and never refuses for want of a match: leaving every source vertex out is a feasible assignment, so a pair with nothing in common gets an empty apex. `SchemaSpan::is_total` and `as_total_morphism` recover the older shape. `protocol` is a parameter because the apex is a schema and is re-validated against one.
2. **The total-morphism entry points return `Result`.** `find_morphisms` answers with a `MorphismList` (whose `truncated` flag says whether the 1024-result cap bound the enumeration) rather than a `Vec`, and it returns the morphisms **attaining** the optimum rather than the whole hom-set ranked. `Ok([])` and `Ok(None)` mean no total morphism exists; a search that could not be posed, or that spent its budget before reaching any complete assignment, is now an `Err` rather than an empty answer. A schema searched against itself used to be told its identity morphism did not exist.
3. **`discover_overlap` takes a `&Protocol` and returns `Result`,** and answers with the maximum common induced sub-schema. It used to run the total-morphism search once per direction and keep whichever embedded more, so a pair where neither schema embeds wholly in the other came back as an empty overlap, which is the ordinary case.

`SearchOptions::initial` is now `hard_pins`, and `preferred`, `max_nodes` and `relax_edge_name_pruning` are gone, as is `DomainConstraints::name_similarity_threshold`. `DomainConstraints::scoring_weights` takes a `CostWeights` rather than a `[f64; 4]`.

Two behaviour changes worth knowing before you calibrate anything on the numbers:

- `quality` is now read out of the objective the search minimised, and the Jaccard component's normaliser is the source vertices carrying at least one named outgoing edge. A source leaf mapped onto a childless target drops out of the denominator instead of scoring zero in it, which raises the mean. Any threshold calibrated against the old number needs re-reading.
- An excluded source vertex is dropped from the *answer* rather than from the *problem*. A total morphism must map every source vertex, so `find_morphisms` with any `excluded_sources` returns empty. Ask for a span when you want the sub-schema answer.

## Step 6: Verify round-trip (optional)

If you used lens-based migration, verify the round-trip laws:
```bash
schema lens verify test-data.json --protocol atproto schema.json
```

A compiled migration is a lens together with its two schemas, so no search is needed to check its laws (0.67.0+):
```python
compiled = panproto.compile_migration(migration, old_schema, new_schema)
compiled.check_laws(instance)     # or check_get_put / check_put_get; raises on violation
```

This checks:
- **GetPut**: `put(get(s), complement(s)) = s` (restoring the complement recovers the original)
- **PutGet**: `get(put(s', c)) = s'` (lifting then projecting gives back the modified view)

## Further Reading

- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html)
- [Tutorial Ch. 5: When Migrations Break](https://panproto.dev/tutorial/chapters/05-when-migrations-break.html)
- [Tutorial Ch. 13: Automatic Migration Discovery](https://panproto.dev/tutorial/chapters/13-automatic-migration-discovery.html)
