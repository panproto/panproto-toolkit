---
name: protolenses
description: >
  Work with protolenses: schema-parameterized lens families that automatically derive
  lenses from schema relationships. Covers protolens chains, optic classification,
  symbolic simplification, symmetric lenses, and fleet application.
---

# Protolenses

You are helping a user work with protolenses, the Level 4 abstraction in panproto. A protolens is not a lens; it is a dependent function from schemas to lenses: `Pi(S : Schema | P(S)). Lens(F(S), G(S))`. A single protolens works on any schema satisfying its precondition.

## Protolens vs. lens

| Concept | Scope | Example |
|---------|-------|---------|
| **Lens** | Fixed pair of schemas | "Map field `name` in schema v1 to field `displayName` in schema v2" |
| **Protolens** | Any schema satisfying a precondition | "For any schema with a `name` field, rename it to `displayName`" |
| **Protolens chain** | Sequence of protolenses | "Rename `name`, then add `bio` with default, then remove `legacyId`" |

## Building protolens chains

### Automatic (from two schemas)

**CLI:**
```bash
schema lens generate old.json new.json --protocol atproto --chain
# Produces a protolens chain, not just a single lens

# Hint-guided generation (0.26.0+)
schema lens generate old.json new.json --protocol atproto --hints hints.json
# Seeds the morphism search with vertex anchors and constraints
```

**TypeScript:**
```typescript
const chain = p.protolensChain(oldSchema, newSchema);
// chain is reusable across schemas with similar structure
```

**Python:**
```python
chain = panproto.ProtolensChain.auto_generate(old_schema, new_schema, proto)
lens = chain.instantiate(old_schema, proto)
```

**Rust:**
```rust
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&old_schema, &new_schema, &protocol, &config)?;
let chain = result.chain;
```

When no alignment exists at all, none of these answers. `p.span(from, to)` and `panproto.find_span(src, tgt, protocol)` do, returning the sub-schema the two share rather than refusing; see `/use-lenses` for the span surface.

### From elementary constructors

`panproto_lens::protolens::elementary` holds the atomic steps; each returns a single `Protolens`, and each carries the precondition its name implies (the named sort or op must be present for a drop or rename, absent for an add).

| Constructor | Effect |
|------------|--------|
| `add_sort(name, kind, default)` / `add_sort_with_default(...)` | Add a sort, with a default for existing data |
| `drop_sort(name)` | Drop a sort; the complement captures its data |
| `rename_sort(old, new)` | Rename a sort |
| `add_op(name, src, tgt, kind)` / `drop_op(name)` / `rename_op(old, new)` | Add, drop or rename an operation |
| `add_edge(...)` / `drop_edge(...)` | Add or drop a schema edge |
| `rename_edge_name(parent, field, old, new)` | Rename a JSON key without touching the sorts (always `Iso`) |
| `sort_coerce(...)` / `sort_coerce_checked(...)` | Change a sort's kind through a coercion witness |
| `add_equation(eq)` / `drop_equation(name)` / `directed_eq(deq)` / `drop_directed_eq(name)` | Edit the theory's equations |
| `pullback(morphism)` | Pull the schema back along a theory morphism |
| `scoped(focus, inner)` | Apply `inner` within the sub-theory reachable from `focus` |

`panproto_lens::protolens::combinators` builds the ordinary field edits out of those, each returning a whole `ProtolensChain`:

| Combinator | Effect |
|------------|--------|
| `rename_field(parent, field, old_name, new_name)` | Rename a field's JSON key |
| `add_field(parent, field_name, field_kind, default)` | Add a sort and the edge reaching it |
| `remove_field(field)` | Drop a sort and its incoming edges |
| `hoist_field(parent, intermediate, child)` | Collapse `parent → intermediate → child` to `parent → child` |
| `nest_field(parent, child, intermediate, kind, edge_kind, old_edge_name, parent_to_intermediate, intermediate_to_child)` | Insert an intermediate vertex between a parent and a child |
| `map_items(focus, inner)` | Apply `inner` to every element of an array (a `Traversal`) |
| `pipeline(chains)` | Concatenate chains |

## Inspecting chains

**CLI:**
```bash
schema lens inspect chain.json --protocol atproto
# Shows each step, its precondition, and its effect
```

**TypeScript:**
```typescript
console.log(chain.toJson());              // the serialized chain
console.log(chain.requirements(schema));  // defaults and data instantiation still needs
console.log(chain.fieldTransforms());     // value-level steps, keyed by parent vertex
console.log(chain.checkApplicability(schema));
```

## Optic classification

Every protolens chain folds to a single `OpticKind`, which is what says whether a complement is needed:

```bash
schema lens inspect chain.json --protocol atproto
```

| `OpticKind` | Meaning | Complement needed? |
|---------------|---------|-------------------|
| `Iso` | Bijective, and every value transform is lossless | No (the complement is terminal) |
| `Lens` | Target is a projection of the source | Yes (it stores the dropped data) |
| `Prism` | Source injects into the target as one variant | Yes (it stores the variant tag) |
| `Affine` | A `Lens` composed with a `Prism` | Yes, and the step may not apply |
| `Traversal` | Multi-focus, e.g. a step under an `item` edge | Yes (it tracks positions) |

## Only the objective decides what is dropped (0.71.0)

Auto-generation used to pre-filter the search scope: three local feasibility scans populated `excluded_sources` before the search ran, excluding any source vertex with no target it could map to with all of its outgoing edges preserved. Those scans are gone. They were stricter than the search itself, so a root whose only outgoing edge had no target counterpart was excluded along with the orphan leaf, and the generated chain carried a `DropSort` for a record the search would have kept. A source vertex is now dropped only where the objective prefers dropping it, and fields that used to disappear at a span tier survive.

At a span tier the candidate list also now comes from the span search rather than from `find_morphisms`, which returns *total* morphisms. No total morphism exists whenever the source carries a sort the target lacks, so `auto_generate_candidates` used to report "no morphism found between schemas" on exactly the pairs a span tier exists for.

## Symbolic simplification

Chains are automatically simplified to remove redundant steps. For example, `rename_sort(a, b)` followed by `rename_sort(b, c)` simplifies to `rename_sort(a, c)`, and a rename followed by its inverse cancels to the identity.

## Fleet application

Apply a protolens chain to many schemas at once:

**CLI:**
```bash
schema lens check chain.json schemas/ --protocol atproto
# Reports which schemas satisfy the precondition
# and what the result would be for each; --dry-run reports without instantiating
```

`schema lens apply` takes one chain and one data file, so fleet application over a directory of schemas is the `check` command plus the SDK's `applyToFleet` below.

**TypeScript:**
```typescript
const { applied, skipped } = chain.applyToFleet(schemas);
// applied: string[] of schema names the chain instantiated against
// skipped: [string, string[]][] pairing each skipped schema with its unmet requirements
```

## Lifting across protocols

Protolens chains can be lifted along theory morphisms to work across protocol boundaries:

```bash
schema lens lift chain.json morphism.json
# Lifts the chain from one protocol to another
```

This uses the theory morphism to translate preconditions and effects between protocols.

## Declarative protolens specifications (v0.25.0+)

Protolens chains can be authored as declarative files in Nickel, JSON, or YAML using the `panproto-lens-dsl` crate. This is preferred when lenses should be loadable data rather than compiled code:

```nickel
let L = import "panproto/lens.ncl" in
{
  id = "my.protolens.chain.v1",
  source = "my.source",
  target = "my.target",
  steps = [
    L.remove "legacyId",
    L.rename "name" "displayName",
    L.add "bio" "string" "",
    L.map_items "items" [
      L.rename "val" "value",
      L.apply "value" "upper value",
    ],
  ],
} | L.Lens
```

Nickel provides typed contracts for validation, record merge for fragment composition, functions for parameterized templates, and imports for modularity. See `/lens-dsl` for the full reference.

## Symmetric lenses

A symmetric lens pairs two protolens chains for full bidirectional sync. `p.symmetricLens(left, right)` is the public constructor (0.62.0+); before it, a symmetric lens had to be built through the lower-level `SymmetricLensHandle.fromSchemas` static, which required passing the internal WASM module handle.

**TypeScript:**
```typescript
using sym = p.symmetricLens(schemaA, schemaB);

// Propagate a change on the left to the right
const { view: rightView, complement: c1 } = sym.syncLeftToRight(leftView, leftComplement);

// And the other way
const { view: leftView2, complement: c2 } = sym.syncRightToLeft(rightView, rightComplement);
```

Both views and both complements are MessagePack bytes. Each side's private information is preserved in the shared complement, so after syncing left to right and back you get the original left.

**Rust:** `auto_symmetric` builds its middle schema by inducing it from one span search on the `iso` path (0.71.0). It used to assemble the overlap by hand into a fresh `Schema` whose adjacency indices were left empty while its edge map was populated, so every adjacency query on the middle schema answered with nothing, and it silently dropped entries, required sets, variants and recursion points. It also refused whenever the two schemas shared no vertex *name*; the refusal is now reachable only when the optimal apex is empty, which takes two schemas whose kinds are disjoint.

## Serialization

Protolens chains can be serialized for storage, cross-project reuse, or version control:

```bash
# Generate straight to a chain file
schema lens generate old.json new.json --protocol atproto --save chain.json

# Import and apply
schema lens apply chain.json record.json --protocol atproto
```

**TypeScript:**
```typescript
const json = chain.toJson();
const restored = ProtolensChainHandle.fromJson(json, wasm);
```

**Python:**
```python
json_text = chain.to_json()
restored = panproto.ProtolensChain.from_json(json_text)
```

Value-level steps do not appear in `toJson()`; call `chain.fieldTransforms()` (TypeScript) to list them and confirm such a step survived compilation.

## Further Reading

- [Tutorial Ch. 16: Protolenses](https://panproto.dev/tutorial/chapters/16-protolenses.html)
- [Tutorial Ch. 17: Automatic Lens Generation](https://panproto.dev/tutorial/chapters/17-automatic-lens-generation.html)
- [Tutorial Ch. 18: Symmetric Lenses](https://panproto.dev/tutorial/chapters/18-symmetric-lenses.html)
