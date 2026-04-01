---
name: dependent-optics
description: >
  Dependent optics and scoped transforms: apply protolens combinators within sub-schemas
  with optic kind determined by edge type (prop→Lens, item→Traversal, variant→Prism).
  Covers ScopedTransform, RenameEdgeName, mapItems, and field-level combinators.
---

# Dependent Optics and Scoped Transforms

Dependent optics extend protolenses with context-sensitive behavior: the optic kind (Lens, Traversal, Prism) depends on the edge connecting the focus vertex to its parent in the Grothendieck fibration.

## When to use

- Applying a transform to every element of an array (`item` edge → Traversal)
- Applying a transform to a single nested object (`prop` edge → Lens)
- Applying a transform conditionally to a union variant (`variant` edge → Prism)
- Renaming JSON property keys without changing the theory structure

## ScopedTransform

`ScopedTransform` applies an inner transform to the sub-theory reachable from a focus sort. Categorically, it is the left Kan extension along the sub-theory inclusion.

```typescript
import { PipelineBuilder } from "@panproto/core";

// Add a "confidence" field with default 1.0 to every element
// of the "words" array
const pipeline = new PipelineBuilder()
  .mapItems("words", (inner) =>
    inner.addField("confidence", "number", 1.0)
  )
  .build();
```

### Optic classification

The optic kind of a scoped transform depends on the edge kind connecting the parent to the focus sort:

| Edge kind | Optic | Behavior |
|-----------|-------|----------|
| `prop` | Lens | Apply inner transform once to the single child |
| `item` | Traversal | Apply inner transform to every array element |
| `variant` | Prism | Apply inner transform only if the variant is present |

Static classification conservatively composes the inner optic kind with `Lens`. At instantiation time, the actual edge kind refines the classification.

## RenameEdgeName

`RenameEdgeName` renames a JSON property key (edge label) without changing the theory structure. It is a fiber-level natural isomorphism: the theory is unchanged, only the schema-level edge metadata is relabeled. Always classified as `Iso` (empty complement).

```typescript
const pipeline = new PipelineBuilder()
  .renameField("oldKey", "newKey")
  .build();
```

## Combinators (0.23.0+)

Built from elementary protolens steps:

| Combinator | Description |
|-----------|-------------|
| `renameField(old, new)` | Rename a JSON property key |
| `removeField(key)` | Drop a field (complement captures dropped data) |
| `addField(key, kind, default)` | Add a field with a default value |
| `hoistField(parent, child)` | Move a nested field up one level |
| `nestField(field, wrapper)` | Wrap a field in a new object |
| `mapItems(array, inner)` | Apply a transform to every element of an array |
| `pipeline(steps)` | Compose multiple steps sequentially |

## CLI

```bash
# Apply a scoped transform via the CLI
schema lens apply \
  --src schema_v1.json \
  --tgt schema_v2.json \
  --protocol atproto \
  --pipeline '[{"type": "scoped", "focus": "word", "inner": {"type": "add_sort", "name": "confidence", "kind": "number", "default": 1.0}}]'
```

## Rust API

```rust
use panproto_gat::schema_functor::TheoryTransform;
use panproto_gat::sort::Sort;

let transform = TheoryTransform::ScopedTransform {
    focus: "word".into(),
    inner: Box::new(TheoryTransform::AddSortWithDefault {
        sort: Sort::val("confidence", ValueKind::Number),
        vertex_kind: None,
        default_expr: panproto_expr::Expr::Lit(
            panproto_expr::Literal::Float(1.0),
        ),
    }),
};
```
