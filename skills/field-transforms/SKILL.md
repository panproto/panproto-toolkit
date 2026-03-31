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
  "active" -> true
  "deleted" -> false
  _ -> true

-- List operations
map (\x -> x * 2) [1, 2, 3]
filter (\x -> x > 0) numbers
foldl (\acc x -> acc + x) 0 numbers

-- String operations
toUpper "hello"          -- "HELLO"
toLower "HELLO"          -- "hello"
trim "  hello  "         -- "hello"
split "," "a,b,c"        -- ["a", "b", "c"]
join ", " ["a", "b"]     -- "a, b"
```

## Applying transforms

### CLI

```bash
# Add enrichments to a schema
schema enrich add-coercion string_kind int_kind \
  --expr '\text -> toUpper text'

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
      expr: '\\s -> parseInt s',
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
            expr='\\s -> parseInt s'
        ),
    ]
)
```

### Rust

```rust
use panproto_inst::FieldTransform;
use panproto_expr_parser::parse;

let transforms = vec![
    FieldTransform::ComputeField {
        target: "user.fullName".into(),
        expr: parse(r#"\record -> record.firstName ++ " " ++ record.lastName"#)?,
    },
    FieldTransform::CoerceType {
        target: "user.age".into(),
        from: "string".into(),
        to: "integer".into(),
        expr: parse(r#"\s -> parseInt s"#)?,
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
