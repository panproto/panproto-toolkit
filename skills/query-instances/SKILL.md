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
  'map (\r -> { name = r.name, email = r.email }) records'

# Combined filter + project
schema expr eval --instance records.json --schema schema.json \
  'map (\r -> { name = r.name }) (filter (\r -> r.active) records)'
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
use panproto_expr_parser;

let tokens = panproto_expr_parser::tokenize(r#"\row -> row.age > 21"#)?;
let filter = panproto_expr_parser::parse(&tokens)?;
let projection = vec!["name".to_string(), "email".to_string()];
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

-- String matching (contains takes the haystack first, then the needle)
\r -> contains (lower r.lastName) "smith"
\r -> slice r.id 0 5 == "user_"   -- prefix test; slice is slice(s, start, end)

-- Null checks
\r -> r.email /= Nothing
\r -> hasField r "phone"

-- List membership (the list overload of contains: contains xs x)
\r -> contains ["active", "pending"] r.status
\r -> length r.tags > 0
\r -> contains r.tags "urgent"
```

## Projection expressions

Project specific fields or compute new ones:

```haskell
-- Simple field projection
\r -> { name = r.name, email = r.email }

-- Nested access
\r -> { city = r.address.city, zip = r.address.zip }

-- Computed fields
\r -> {
  fullName = r.firstName ++ " " ++ r.lastName,
  ageGroup = if r.age >= 18 then "adult" else "minor",
  tagCount = length r.tags
}

-- Rename fields
\r -> { displayName = r.name, createdDate = r.createdAt }
```

## Aggregation

```haskell
-- Count
length (filter (\r -> r.active) records)

-- Sum (fold surface order is `fold f z xs`; f is curried: \acc -> \x -> ...)
fold (\acc r -> acc + r.amount) 0 records

-- Average
let total = fold (\acc x -> acc + x) 0 (map (\r -> r.score) records)
    count = length records
in int_to_float total / int_to_float count
```

## Graph traversal

For graph-shaped instances (not just flat records), use edge-following syntax:

```haskell
-- Follow edges from a vertex (the `edge` builtin takes a node then an edge kind)
\v -> edge v "prop"            -- follow "prop" edges from v
\v -> edge v "ref-target"      -- follow "ref-target" edges

-- Multi-hop
\v -> edge (edge v "record-schema") "prop"

-- Collect all reachable vertices (flat_map replaces flatten . map)
\root -> flat_map (\child -> edge child "prop") (edge root "record-schema")
```

## Working with W-type instances

W-type (tree-shaped) instances have a root node with children organized into fans:

```haskell
-- Access root
\inst -> inst.root

-- Access children via fan
\node -> node.children              -- all children
\node -> head node.children         -- first child

-- Navigate by edge kind
\node -> edge node "record-schema"  -- children via this edge kind
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
