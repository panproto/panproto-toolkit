---
name: query-instances
description: >
  Query and filter panproto instances using the expression language and the query API.
  Covers predicates, projections, computed fields, and declarative queries.
---

# Querying Instances

You are helping a user query and filter panproto instances. The query system uses the expression language for predicates and projections.

## Basic queries

### CLI

```bash
# Filter records matching a predicate
schema expr eval --instance records.json --schema schema.json \
  'filter (\r -> r.age > 21) records'

# Project specific fields
schema expr eval --instance records.json --schema schema.json \
  'map (\r -> { name: r.name, email: r.email }) records'

# Combined filter + project
schema expr eval --instance records.json --schema schema.json \
  'map (\r -> { name: r.name }) (filter (\r -> r.active) records)'
```

### TypeScript

```typescript
const results = executeQuery(instance, schema, {
  filter: '\\row -> row.age > 21',
  project: ['name', 'email'],
});

// Or with computed fields
const results = executeQuery(instance, schema, {
  filter: '\\row -> row.status == "active"',
  project: ['name', 'email'],
  computed: {
    fullName: '\\row -> row.firstName ++ " " ++ row.lastName',
    ageGroup: '\\row -> if row.age >= 18 then "adult" else "minor"',
  },
});
```

### Python

```python
results = panproto.query(instance, schema,
    filter_expr='\\row -> row.age > 21',
    project=["name", "email"],
    computed={
        "fullName": '\\row -> row.firstName ++ " " ++ row.lastName',
    }
)
```

### Rust

```rust
use panproto_expr_parser::parse;

let filter = parse(r#"\row -> row.age > 21"#)?;
let projection = vec!["name".to_string(), "email".to_string()];
let results = panproto_inst::query(&instance, &schema, Some(&filter), &projection)?;
```

## Predicate expressions

Predicates are expressions that return a boolean:

```haskell
-- Comparison
\r -> r.age > 21
\r -> r.name == "Alice"
\r -> r.score >= 90.0

-- Logical operators
\r -> r.active && r.verified
\r -> r.role == "admin" || r.role == "moderator"
\r -> not (r.deleted)

-- String matching
\r -> contains "smith" (toLower r.lastName)
\r -> startsWith "user_" r.id
\r -> regex "^[A-Z]{2}[0-9]{4}$" r.code

-- Null checks
\r -> r.email /= null
\r -> hasField "phone" r

-- List membership
\r -> elem r.status ["active", "pending"]
\r -> length r.tags > 0
\r -> any (\t -> t == "urgent") r.tags
```

## Projection expressions

Project specific fields or compute new ones:

```haskell
-- Simple field projection
\r -> { name: r.name, email: r.email }

-- Nested access
\r -> { city: r.address.city, zip: r.address.zip }

-- Computed fields
\r -> {
  fullName: r.firstName ++ " " ++ r.lastName,
  ageGroup: if r.age >= 18 then "adult" else "minor",
  tagCount: length r.tags
}

-- Rename fields
\r -> { displayName: r.name, createdDate: r.createdAt }
```

## Aggregation

```haskell
-- Count
length (filter (\r -> r.active) records)

-- Sum
foldl (\acc r -> acc + r.amount) 0 records

-- Average
let total = foldl (+) 0 (map (\r -> r.score) records)
    count = length records
in toFloat total / toFloat count

-- Group by (manual)
let groups = foldl (\acc r ->
  let key = r.department
      existing = getField key acc
  in setField key (existing ++ [r]) acc
) {} records
in groups
```

## Graph traversal

For graph-shaped instances (not just flat records), use edge-following syntax:

```haskell
-- Follow edges from a vertex
\v -> v -> "prop"           -- follow "prop" edges from v
\v -> v -> "ref-target"     -- follow "ref-target" edges

-- Multi-hop
\v -> v -> "record-schema" -> "prop"

-- Collect all reachable vertices
\root -> flatten (map (\child -> child -> "prop") (root -> "record-schema"))
```

## Working with W-type instances

W-type (tree-shaped) instances have a root node with children organized into fans:

```haskell
-- Access root
\inst -> inst.root

-- Access children via fan
\node -> node.children          -- all children
\node -> node.children[0]       -- first child

-- Navigate by edge kind
\node -> node -> "record-schema"  -- children via this edge kind
```

## Fiber operations

Decompose instances along fibers (projections to specific vertex kinds):

```typescript
const fiber = p.fiberAt(instance, schema, 'post:body');
// Returns the sub-instance rooted at 'post:body'

const decomposition = p.fiberDecomposition(instance, schema);
// Returns one fiber per vertex kind
```

## Further Reading

- [Tutorial Ch. 21: Querying Instances](https://panproto.dev/tutorial/chapters/21-querying-instances.html)
