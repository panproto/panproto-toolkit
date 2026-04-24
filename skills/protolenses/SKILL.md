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
schema lens generate old.json new.json
# Produces a protolens chain, not just a single lens

# Hint-guided generation (0.26.0+)
schema lens generate old.json new.json --hints hints.json
# Seeds the morphism search with vertex anchors and constraints
```

**TypeScript:**
```typescript
const chain = p.protolensChain(oldSchema, newSchema);
// chain is reusable across schemas with similar structure
```

**Python:**
```python
lens, quality = panproto.auto_generate_lens(old_schema, new_schema, proto)
```

**Rust:**
```rust
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&old_schema, &new_schema, &protocol, &config)?;
let chain = result.chain;
```

### From elementary constructors

Elementary protolens constructors are the atomic building blocks:

| Constructor | Precondition | Effect |
|------------|-------------|--------|
| `Identity` | Any schema | No-op |
| `RenameVertex(old, new)` | Schema has vertex `old` | Renames vertex |
| `RenameEdge(old, new)` | Schema has edge `old` | Renames edge |
| `AddVertex(name, kind, default)` | Schema lacks vertex `name` | Adds vertex with default |
| `RemoveVertex(name)` | Schema has vertex `name` | Removes vertex (stored in complement) |
| `AddEdge(src, tgt, kind)` | Schema has both endpoints | Adds edge |
| `RemoveEdge(src, tgt)` | Schema has edge | Removes edge |
| `CoerceType(vertex, from, to, expr)` | Vertex has kind `from` | Changes kind, applies coercion |
| `WrapInObject(field, wrapper)` | Schema has field | Nests field in new object |
| `HoistField(wrapper, field)` | Schema has nested field | Lifts field out |

## Inspecting chains

**CLI:**
```bash
schema lens inspect chain.json --protocol atproto
# Shows each step, its precondition, and its effect
```

**TypeScript:**
```typescript
const steps = chain.steps();
for (const step of steps) {
  console.log(step.type, step.description);
}
```

## Optic classification

Every protolens chain is classified by its information-theoretic properties:

```bash
schema lens inspect chain.json --protocol atproto
```

| Classification | Meaning | Complement needed? |
|---------------|---------|-------------------|
| **Isomorphism** | Bijective, no data loss | No (complement is empty) |
| **Injection** | Source embeds in target | No for forward, yes for backward |
| **Projection** | Target is subset of source | Yes (complement stores dropped data) |
| **Affine** | Partial function | Yes, and may fail on some inputs |
| **General** | None of above | Yes |

## Naturality-aware span exclusion (0.38.0+)

At `Stringency::Lenient` and above, the CSP scope is now pre-filtered by a naturality consistency predicate: source vertices that cannot participate in any seed-respecting mapping are excluded before the solver runs. The previous kind-only predicate kept too many sources in scope on sparse-overlap schema pairs, causing the search to bail with no candidates. If you have cross-protocol runs that previously failed with empty candidate sets, retry them on 0.38 before reaching for additional hints. Fixes panproto/panproto#51.

## Symbolic simplification

Chains are automatically simplified to remove redundant steps. For example, `RenameVertex(a, b)` followed by `RenameVertex(b, c)` simplifies to `RenameVertex(a, c)`.

## Fleet application

Apply a protolens chain to many schemas at once:

**CLI:**
```bash
schema lens check chain.json --protocol atproto schemas/
# Reports which schemas satisfy the precondition
# and what the result would be for each

schema lens apply chain.json --protocol atproto schemas/
# Applies the chain to all compatible schemas
```

**TypeScript:**
```typescript
const results = chain.applyToFleet(schemas);
// results: Map<string, { compatible: boolean, result?: Schema }>
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

A symmetric lens pairs two protolens chains for full bidirectional sync:

**TypeScript:**
```typescript
const sym = p.symmetricLens(schemaA, schemaB);

// Sync from A to B
const { updated: updatedB, complement: newComp } = sym.syncAtoB(recordA, complementA);

// Sync from B to A
const { updated: updatedA, complement: newComp2 } = sym.syncBtoA(recordB, complementB);
```

**CLI:**
```bash
schema lens apply lens.json recordA.json --protocol atproto --direction forward complementA.json
```

Symmetric lenses maintain consistency: after syncing A to B and then B back to A, you get the original A (up to complement).

## Serialization

Protolens chains can be serialized for storage, cross-project reuse, or version control:

```bash
# Export chain to JSON
schema lens inspect chain.json --json > exported-chain.json

# Import and apply
schema lens apply exported-chain.json record.json
```

**TypeScript:**
```typescript
const json = chain.toJSON();
const restored = p.protolensChainFromJSON(json);
```

## Further Reading

- [Tutorial Ch. 16: Protolenses](https://panproto.dev/tutorial/chapters/16-protolenses.html)
- [Tutorial Ch. 17: Automatic Lens Generation](https://panproto.dev/tutorial/chapters/17-automatic-lens-generation.html)
- [Tutorial Ch. 18: Symmetric Lenses](https://panproto.dev/tutorial/chapters/18-symmetric-lenses.html)
