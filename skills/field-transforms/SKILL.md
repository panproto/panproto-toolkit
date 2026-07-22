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

| Transform | What it does | Example |
|-----------|-------------|---------|
| `RenameField` | Rename + optional value transform | Rename `name` to `displayName`, uppercase |
| `ComputeField` | Generate a new field from existing data | `fullName = firstName ++ " " ++ lastName` |
| `CoerceType` | Convert between types | String "42" to integer 42 |
| `SplitField` | Split one field into multiple | `name` into `firstName` + `lastName` |
| `MergeFields` | Merge multiple fields into one | `firstName` + `lastName` into `name` |
| `ConditionalSurvival` | Keep/drop based on value | Drop records where `status == "deleted"` |
| `DefaultValue` | Provide default for new fields | `bio` defaults to `""` |

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

```typescript
// Define transforms alongside migration
const chain = p.protolensChain(oldSchema, newSchema, {
  transforms: [
    {
      type: 'ComputeField',
      target: 'user.fullName',
      expr: '\\record -> record.firstName ++ " " ++ record.lastName',
    },
    {
      type: 'CoerceType',
      target: 'user.age',
      from: 'string',
      to: 'integer',
      expr: '\\s -> str_to_int s',
    },
    {
      type: 'ConditionalSurvival',
      predicate: '\\record -> record.status /= "deleted"',
    },
  ],
});
```

### Python

```python
lens, quality = panproto.auto_generate_lens(
    old_schema, new_schema, proto,
    transforms=[
        panproto.ComputeField(
            target="user.fullName",
            expr='\\record -> record.firstName ++ " " ++ record.lastName'
        ),
        panproto.CoerceType(
            target="user.age",
            from_kind="string",
            to_kind="integer",
            expr='\\s -> str_to_int s'
        ),
    ]
)
```

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
