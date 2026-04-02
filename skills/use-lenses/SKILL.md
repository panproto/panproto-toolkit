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
schema lens generate old.json new.json --protocol atproto
# Outputs: lens.json
```

**TypeScript:**
```typescript
const chain = p.protolensChain(oldSchema, newSchema);
// chain.apply(record) does get + put in one step
```

**Python:**
```python
lens, quality = panproto.auto_generate_lens(old_schema, new_schema, proto)
# quality tells you: isomorphism, injection, projection, affine, or general
```

**Rust:**
```rust
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&old_schema, &new_schema, &protocol, &config)?;
let lens = result.lens;
```

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

**Constraints** restrict the CSP solver:
- `scope`: restrict search to vertices under a given parent pair
- `exclude_targets` / `exclude_sources`: remove vertices from consideration
- `prefer`: adjust scoring weights (e.g., prefer same edge names, similar names, same kinds)

**TypeScript:**
```typescript
const chain = p.protolensChainWithHints(oldSchema, newSchema, {
  anchors: { 'post': 'article' },
  constraints: [{ type: 'scope', under: 'post:body', targets: 'article:content' }],
});
```

**Python:**
```python
chain = panproto.ProtolensChain.auto_generate_with_hints(
    old_schema, new_schema, proto,
    hints={"post": "article", "post:body": "article:content"}
)
```

### Optic classification

Auto-generation classifies the transform quality:

| Classification | Meaning | Round-trip |
|---------------|---------|------------|
| Isomorphism | Bijective (no data loss in either direction) | Perfect both ways |
| Injection | Source embeds into target (target has extra fields) | Perfect source to target |
| Projection | Target is a subset of source (fields dropped) | Complement needed for reverse |
| Affine | Partial function (some source elements have no target) | May fail on some inputs |
| General optic | None of the above | Complement needed, may be lossy |

## Step 2: Use get/put

### Forward (get): project data from old to new schema

**CLI:**
```bash
schema lens apply lens.json record.json --protocol atproto --direction forward
# Outputs: { "view": {...}, "complement": {...} }
```

**TypeScript:**
```typescript
const { view, complement } = chain.get(record);
// view: the record projected to the new schema
// complement: data discarded during projection
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
schema lens apply lens.json modified-view.json --protocol atproto --direction backward complement.json
```

**TypeScript:**
```typescript
const restored = chain.put(modifiedView, complement);
```

**Python:**
```python
restored = lens.put(modified_view, complement)
```

**Rust:**
```rust
let restored = panproto_lens::put(&lens, &modified_view, &complement)?;
```

## Step 3: Compose lenses

Chain multiple lenses for multi-step migrations:

**CLI:**
```bash
schema lens compose v1-to-v2.json v2-to-v3.json --protocol atproto
# Outputs: v1-to-v3.json
```

**TypeScript:**
```typescript
const chain = p.composeLenses(v1ToV2, v2ToV3);
```

**Python:**
```python
composed = panproto.compose_lenses(v1_to_v2, v2_to_v3)
```

## Step 4: Verify lens laws

Always verify on representative test data:

**CLI:**
```bash
schema lens verify test-data.json --protocol atproto --schema schema.json
```

**TypeScript:**
```typescript
const result = p.checkLensLaws(chain, testInstance);
console.log(result.getPut); // true/false
console.log(result.putGet); // true/false
```

**Python:**
```python
result = panproto.check_lens_laws(lens, test_instance)
print(result.get_put)  # True/False
print(result.put_get)  # True/False
```

## Step 5: Cambria-style combinators (manual lens construction)

For cases where auto-generation is insufficient, build lenses from atomic combinators:

| Combinator | What it does |
|-----------|-------------|
| `RenameField(old, new)` | Rename a field |
| `AddField(name, type, default)` | Add a field with a default value |
| `RemoveField(name)` | Remove a field (stored in complement) |
| `WrapInObject(field, wrapper)` | Nest a field inside a new object |
| `HoistField(wrapper, field)` | Unnest a field from an object |
| `CoerceType(field, from, to)` | Convert a field's type (e.g., string to integer) |

**CLI:**
```bash
cat > lens.json << 'EOF'
{
  "combinators": [
    { "type": "RenameField", "from": "name", "to": "displayName" },
    { "type": "AddField", "name": "bio", "kind": "string", "default": "" },
    { "type": "RemoveField", "name": "legacyId" }
  ]
}
EOF
schema lens apply lens.json record.json --protocol atproto --direction forward
```

**TypeScript:**
```typescript
const lens = p.lensFromCombinators([
  { type: 'RenameField', from: 'name', to: 'displayName' },
  { type: 'AddField', name: 'bio', kind: 'string', default: '' },
  { type: 'RemoveField', name: 'legacyId' },
]);
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

## Further Reading

- [Tutorial Ch. 6: Bidirectional Migration with Lenses](https://panproto.dev/tutorial/chapters/06-bidirectional-migration-with-lenses.html)
- [Tutorial Ch. 16: Protolenses](https://panproto.dev/tutorial/chapters/16-protolenses.html)
- [Tutorial Ch. 17: Automatic Lens Generation](https://panproto.dev/tutorial/chapters/17-automatic-lens-generation.html)
- [Tutorial Ch. 18c: Declarative Lens Specifications](https://panproto.dev/tutorial/chapters/18c-declarative-lens-specifications.html)
