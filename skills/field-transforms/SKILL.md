---
name: field-transforms
description: >
  Apply value-dependent transforms during migration. Covers FieldTransform,
  PathTransform, conditional_survival, computed fields, and the expression language
  for data-level manipulation.
---

# Field Transforms

You are helping a user apply value-dependent transforms during schema migration. While structural migrations (vertex/edge maps) handle the shape of data, field transforms handle the values.

## When you need field transforms

Structural migration handles: renames, additions, removals, restructuring.
Field transforms handle: type coercions, computed defaults, conditional logic, value splitting/merging.

## FieldTransform types

`panproto_inst::FieldTransform` has eight variants, and each acts on a node's `extra_fields` after the structural operations (anchor remapping, vertex survival) have run:

| Transform | What it does | Example |
|-----------|-------------|---------|
| `RenameField { old_key, new_key }` | Rename a field key | `name` to `displayName` |
| `DropField { key }` | Remove a field | Drop `legacyId` |
| `AddField { key, value }` | Add a field with a constant value | `bio` defaults to `""` |
| `KeepFields { keys }` | Keep only the named fields | Whitelist a projection |
| `ApplyExpr { key, expr, inverse, coercion_class }` | Rewrite a field's value in place | `"42"` to `42` |
| `ComputeField { target_key, expr, inverse, coercion_class }` | Write a new field from the whole fiber over the parent | `fullName = concat firstName " " lastName` |
| `PathTransform { path, inner }` | Apply an inner transform at a nested path in the `Value` tree | Trim `address.zip` |
| `Case { branches }` | Ordered predicate/transform pairs; the first matching branch applies | `if level == 1 then rename to h1` |
| `MapReferences { .. }` | Rewrite string values that name vertices, along a rename map | Keep a parent-reference array in step with a rename |

`ApplyExpr` and `ComputeField` differ in what they bind and where they write. `ApplyExpr` binds one field and rewrites it; `ComputeField` binds every `extra_field`, every nested attr, and the child values of the parent node, and writes the result to a new key.

Conditional survival is not a `FieldTransform`; it is a schema enrichment (see below).

## Using expressions in transforms

Field transforms use panproto's expression language (a pure functional lambda calculus):

```
\record -> record.firstName ++ " " ++ record.lastName
```

### Expression syntax quick reference

```
-- Literals
42, 3.14, "hello", true, null

-- Field access
record.name, record.address.city

-- Lambda
\x -> x + 1

-- Let binding
let fullName = first ++ " " ++ last in fullName

-- Conditionals
if record.age >= 18 then "adult" else "minor"

-- Pattern matching
case record.status of
  "active" -> True
  "deleted" -> False
  _ -> True

-- List operations
map (\x -> x * 2) [1, 2, 3]
filter (\x -> x > 0) numbers
fold (\acc -> \x -> acc + x) 0 numbers

-- String operations
upper "hello"           -- "HELLO"
lower "HELLO"           -- "hello"
trim "  hello  "         -- "hello"
split "a,b,c" ","        -- ["a", "b", "c"]
join ["a", "b"] ", "     -- "a, b"
```

## Applying transforms

### CLI

```bash
# Add enrichments to a schema
schema enrich add-coercion string_kind int_kind \
  --expr '\text -> upper text'

schema enrich add-default post:body.bio \
  --expr '""'

schema enrich add-merger post:body.fullName \
  --expr '\record -> record.firstName ++ " " ++ record.lastName'
```

### TypeScript

Field transforms reach the SDK through a lens document, not through `protolensChain`, which takes two schemas and nothing else. Compile the document and read `fieldTransforms()` to confirm the value-level steps survived:

```typescript
const chain = p.compileLensDocument({
  id: 'demo.user.v2',
  source: 'user.v1',
  target: 'user.v2',
  steps: [
    { compute_field: { target: 'fullName', expr: 'concat firstName " " lastName' } },
    { apply_expr: { field: 'age', expr: 'str_to_int age' } },
  ],
}, 'user:body');

console.log(chain.fieldTransforms());   // Record<string, unknown[]>, keyed by parent vertex

const lens = chain.instantiate(schema);
const { view, complement } = lens.get(record);   // the expressions run here
```

### Python

Same route. There is no `FieldTransform` class on the Python surface; author the transforms as a document and compile it:

```python
chain = panproto.ProtolensChain.from_dsl_json(
    json.dumps({
        "id": "demo.user.v2",
        "source": "user.v1",
        "target": "user.v2",
        "steps": [
            {"compute_field": {"target": "fullName",
                               "expr": 'concat firstName " " lastName'}},
            {"apply_expr": {"field": "age", "expr": "str_to_int age"}},
        ],
    }),
    "user:body",
)
lens = chain.instantiate(schema, proto)
view, complement = lens.get(instance)
```

`from_dsl_yaml(source, body_vertex)` and `from_dsl_nickel(source, body_vertex, import_paths=None)` take the same document in the other two surfaces.

### Rust

```rust
use panproto_inst::FieldTransform;
use panproto_expr_parser;

fn parse_expr(s: &str) -> panproto_expr::Expr {
    let tokens = panproto_expr_parser::tokenize(s).unwrap();
    panproto_expr_parser::parse(&tokens).unwrap()
}

let transforms = vec![
    FieldTransform::ComputeField {
        target_key: "user.fullName".into(),
        expr: parse_expr(r#"\record -> record.firstName ++ " " ++ record.lastName"#),
        inverse: None,
        coercion_class: panproto_gat::CoercionClass::Opaque,
    },
    FieldTransform::ApplyExpr {
        key: "user.age".into(),
        expr: parse_expr(r#"\s -> str_to_int s"#),
        inverse: None,
        coercion_class: panproto_gat::CoercionClass::Opaque,
    },
];
```

## PathTransform for nested structures

Navigate and transform nested data:

```
-- Access nested fields
\record -> record.address.city

-- Transform at a path
\record -> { ...record, address: { ...record.address, zip: trim record.address.zip } }
```

## List- and record-valued transforms

As of 0.60.0 field transforms are structure-preserving in both directions: an expression can read from, and return, a list-valued or nested-object-valued field. Before 0.60.0 such a transform silently did nothing (no error, no change) and only scalar fields worked. This matters most for ATProto records, which keep arrays and nested objects inline rather than as child vertices.

The list builtins are function-first in surface syntax (`map f xs`, `filter f xs`, `fold f init xs`). Record literals use `=` for fields.

```rust
// map/fold/filter over an array field (ApplyExpr rewrites the field in place)
apply_expr("nums", "map (\\x -> x + 1) nums")            // [1,2,3] -> [2,3,4]
apply_expr("objs", "map (\\o -> o.a) objs")              // project a field from an array of objects

// field access through a nested object (ComputeField reads a new field)
compute_field("out", "nested.a")                          // { a = 7, b = 70 } -> 7
compute_field("total", "fold (\\x -> \\y -> x + y) 0 nums")
compute_field("big", "filter (\\x -> x > 1) nums")        // [1,2,3] -> [2,3]

// an expression that BUILDS a list of records is written back as structured data
// (a flat->nested regroup, moving fields one level deeper)
compute_field(
    "regrouped",
    "map (\\o -> { outer = o.a, inner = { deep = o.b } }) objs",
)
// [{a=1,b=10},{a=2,b=20}] -> [{outer=1,inner={deep=10}},{outer=2,inner={deep=20}}]
```

Because the value written back is structured rather than flattened, a later transform can read an earlier one's output, and `contains xs elem` tests element membership on a list-valued field.

## Aggregating over an array-of-objects child (0.66.0+)

A transform's environment used to bind `extra_fields` plus the node's *scalar* children, so a child that is an array of records bound to nothing and an aggregate at the parent could not be written at all: it failed with `unbound variable`. The graph-traversal builtins were no help, because they take a node reference and no current node was supplied, so `children` / `edge` / `edge_count` / `anchor` evaluated to null wherever a transform ran.

Two bindings close that gap:

1. Structural children are materialized as well as scalars: an ordered collection becomes a `Value::List` and a record a `Value::Unknown`, recursively, following the same list/record decision `to_json` makes. Since values are converted to expression literals structure-preservingly, `map` / `fold` / `head` and field projection reach them directly.
2. `TransformContext` carries the instance and the node id into evaluation, so `"self"` resolves. The graph builtins walk from the current node, and the whole fiber is additionally bound as the variable `self`.

```rust
// aggregates over a keyframe array, written at the parent
compute_field("frameCount", "length keyframes")
compute_field("totalMs", "fold (\\a -> \\k -> a + k.timeMs) 0 keyframes")
compute_field("childCount", "edge_count self")            // arcs out of the current node
```

Materialization is demand-bounded: a structural child is walked only when a transform's free variables name it, or when `self` is read, which cannot say in advance which children it will reach. The common scalar-only transform costs what it did before.

`apply_field_transforms(node, transforms, ctx)` takes a `&TransformContext<'_>` in place of the bare child-scalar map it used to take. Build one with `TransformContext::new(schema, instance, node_id, transforms)`, or `TransformContext::detached()` for the previous `extra_fields`-only behaviour when you hold a node but no instance.

## An invertible transform's inverse reaches the field it read (0.66.0+)

A `ComputeField` carrying an `inverse` used to write the inverted value to its own `target_key`, which reinstated on the source a computed key the source never carried and dropped the edit. `put` now removes the computed key and sends the inverse's result to the field the forward expression reads, identified as its sole free variable. A computation over several fields, or over none, has no single coordinate to restore and is not a bijection whatever its `coercion_class` claims.

`ApplyExpr` had the same split in a subtler form. Over a *child scalar* it reads the child and writes a shadowing `extra_fields` entry on the parent, so the backward pass invented a parent field the source never had; it now writes back only where the source carried an entry, leaving the child node authoritative.

Classification follows the same distinction. A transform is an independent view coordinate only when it *replaces* what it read rather than adding a value beside it: `up = upper(a)` with `a` still in the view is derived, since `get` recomputes `up` from `a` whatever the inverse says, while the same computation followed by dropping `a` is independent and an edit to `up` round-trips to `a` exactly.

## Failed transforms are reported

Also as of 0.60.0, a field transform whose expression cannot evaluate raises an error naming the field (Rust `RestrictError::FieldTransformFailed`) rather than leaving the field untouched and reporting success. A transform that references a missing field (e.g. `compute_field("out", "missing_field.a")`) now fails the migration loudly instead of silently doing nothing.

## Conditional survival

Filter records during migration based on their values:

```bash
schema enrich add-policy post:body.status \
  --strategy conditional-survival \
  --predicate '\record -> record.status /= "deleted"'
```

Records failing the predicate are stored in the complement (not destroyed), so backward migration can restore them.

## Conflict resolution policies

When merging branches that modify the same field:

| Policy | Behavior |
|--------|----------|
| `keep-left` | Use the left branch's value |
| `keep-right` | Use the right branch's value |
| `merge` | Apply a merger expression |
| `error` | Fail on conflict |

```bash
schema enrich add-policy post:body.text \
  --strategy merge \
  --merger '\left right -> left ++ "\n---\n" ++ right'
```

## Further Reading

- [Tutorial Ch. 20: Value-Dependent Transforms](https://panproto.dev/tutorial/chapters/20-value-dependent-transforms.html)
