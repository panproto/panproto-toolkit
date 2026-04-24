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
schema diff --src old.json --tgt new.json
```

## Step 2: Choose an approach

There are three ways to build a migration:

### A. Automatic (recommended for simple changes)

Let panproto discover the migration automatically:

**CLI:**
```bash
schema lens generate old.json new.json --protocol atproto
```

**TypeScript:**
```typescript
const chain = p.protolensChain(oldSchema, newSchema);
```

**Python:**
```python
lens, quality = panproto.auto_generate_lens(old_schema, new_schema, proto)
```

**Rust:**
```rust
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&old_schema, &new_schema, &protocol, &config)?;
```

Auto-generation works well for: field renames, field additions with defaults, field removals, type coercions, and simple structural rearrangements.

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

Forward-chaining constraint propagation derives additional anchors from the declared ones, then the CSP solver runs with the restricted domains.

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
const report = p.checkExistence(oldSchema, newSchema, migration);
if (!report.valid) {
  console.log(report.issues);
}
```

**Python:**
```python
report = panproto.check_existence(old_schema, new_schema, migration)
if not report.valid:
    print(report.issues)
```

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
const compiled = p.compileMigration(oldSchema, newSchema, migration);
const result = compiled.lift(record);
```

**Python:**
```python
compiled = panproto.compile_migration(old_schema, new_schema, migration)
result = compiled.lift(record)
```

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
```bash
schema data migrate records/ --src-schema old.json --tgt-schema new.json
```

### With version control
```bash
schema data migrate records/   # uses schema history to find the right migration
```

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

Exit code is non-zero on any falsifying sample. See `/panproto-coercion-law-checks` for the full gate, violation kinds, and GitHub Actions wiring. Opt into `AutoLensConfig.coercion_law_registry` to filter dishonest coerce anchors out of the CSP search space during auto-generation.

## Step 6: Verify round-trip (optional)

If you used lens-based migration, verify the round-trip laws:
```bash
schema lens verify test-data.json --protocol atproto --schema schema.json
```

This checks:
- **GetPut**: `put(get(s), complement(s)) = s` (restoring the complement recovers the original)
- **PutGet**: `get(put(s', c)) = s'` (lifting then projecting gives back the modified view)

## Further Reading

- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html)
- [Tutorial Ch. 5: When Migrations Break](https://panproto.dev/tutorial/chapters/05-when-migrations-break.html)
- [Tutorial Ch. 13: Automatic Migration Discovery](https://panproto.dev/tutorial/chapters/13-automatic-migration-discovery.html)
