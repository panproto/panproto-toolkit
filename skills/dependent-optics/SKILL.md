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

// Add a "confidence" field to every element of the "words" array.
// `mapItems` takes a single inner step, not a builder callback, and
// PipelineBuilder is constructed with the WASM module.
const chain = new PipelineBuilder(wasm)
  .mapItems("word", { step_type: "add_field", parent: "word", name: "confidence", kind: "number" })
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
const chain = new PipelineBuilder(wasm)
  .renameEdgeName("word", "word.text", "oldKey", "newKey")
  .build();
```

## Combinators (0.23.0+)

Built from elementary protolens steps. The `PipelineBuilder` methods and the Rust `panproto_lens::protolens::combinators` functions take the same arguments:

| Combinator | Description |
|-----------|-------------|
| `renameField(parent, old, new)` | Rename a field's vertex name and JSON property key |
| `removeField(key)` | Drop a field (complement captures dropped data) |
| `addField(parent, name, kind)` | Add a field and the edge reaching it |
| `hoistField(parent, intermediate, child)` | Collapse `parent → intermediate → child` into `parent → child` |
| `nestField(parent, child, intermediate, kind, options?)` | Insert an intermediate vertex between a parent and a child |
| `renameEdgeName(srcSort, tgtSort, old, new)` | Rename a JSON property key without touching the sorts |
| `mapItems(focus, inner)` | Apply an inner step to every element of an array |
| `step(raw)` | Append a raw elementary step |

`build()` returns a `ProtolensChainHandle`; every method returns `this`, so the calls chain.

## CLI

There is no `--pipeline` argument. Author the scoped transform as a lens document, compile it, and apply the resulting chain:

```bash
cat > scoped.yaml <<'EOF'
id: demo.word.confidence.v1
source: transcript.v1
target: transcript.v2
steps:
  - scoped:
      focus: word
      inner:
        - add_field: { name: confidence, kind: number, fallback: 1.0 }
EOF

schema lens compile scoped.yaml --body-vertex transcript:body --out chain.json
schema lens apply chain.json record.json --protocol atproto --direction forward
```

## Rust API

```rust
use panproto_gat::TheoryTransform;

let transform = TheoryTransform::ScopedTransform {
    focus: "word".into(),
    inner: Box::new(TheoryTransform::AddSortWithDefault {
        sort: panproto_gat::Sort::with_kind(
            "confidence",
            panproto_gat::SortKind::Val(panproto_gat::ValueKind::Float),
        ),
        vertex_kind: None,
        default_expr: panproto_expr::Expr::Lit(
            panproto_expr::Literal::Float(1.0),
        ),
    }),
};
```
