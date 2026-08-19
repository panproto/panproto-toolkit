---
name: query-instances
description: >
  Query and filter panproto instances using the expression language and the query API.
  Covers anchors, path navigation, predicates, grouping, projection, and the graph
  traversal builtins.
---

# Querying Instances

You are helping a user query and filter panproto instances. The query system selects nodes structurally and filters them with an expression-language predicate.

A query is a structural selection over the instance graph, not a SQL-style
statement over a table. It picks nodes by their **anchor** (the schema vertex
they sit at), optionally follows a **path** of edge kinds first, filters the
survivors with a **predicate** expression, then groups, projects, and limits.
The pipeline runs in that order: anchor → path → predicate → limit → group →
project.

The predicate is an expression **AST**, not a lambda source string. It is
evaluated once per candidate node with that node's whole observable stalk bound
as variables: its `extra_fields`, the scalar values of children reachable by
labelled edges, and its metadata.

### Rust

```rust
use panproto_inst::{InstanceQuery, execute_query};

let tokens = panproto_expr_parser::tokenize("likes > 10")?;
let predicate = panproto_expr_parser::parse(&tokens)?;

let query = InstanceQuery {
    anchor: "post".into(),
    predicate: Some(predicate),
    project: Some(vec!["title".into(), "likes".into()]),
    limit: Some(50),
    group_by: None,
    path: vec![],
};

for m in execute_query(&query, &instance, &schema) {
    println!("{} {:?}", m.node_id, m.fields);
}
```

### TypeScript

```typescript
import { executeQuery, ExprBuilder } from '@panproto/core';

const matches = executeQuery(
  {
    anchor: 'post',
    // `likes` is bound directly: the node's stalk is the environment,
    // so there is no receiver to project off.
    predicate: ExprBuilder.builtin(
      'Gt',
      ExprBuilder.var_('likes'),
      ExprBuilder.lit({ type: 'int', value: 10 }),
    ),
    projection: ['title', 'likes'],
    limit: 50,
  },
  instance,
  p._wasm,
);

for (const m of matches) {
  console.log(m.nodeId, m.anchor, m.value, m.fields);
}
```

The query comes first, then the instance, then the WASM module. `groupBy` and
`path` are the two remaining fields: `path` follows edge kinds from the anchor
before matching, `groupBy` partitions the results by a field name.

### Python and the CLI

Neither surface carries the query engine. Python exposes `parse_expr`,
`Expr.eval` and `Expr.pretty`, which evaluate an expression with no instance in
scope, so the graph-traversal builtins return `Nothing` there. `schema expr
eval <source>` is the same: it takes a source string and prints the result as
JSON, with no `--instance` or `--schema` flag. Reach for the Rust or TypeScript
surface when the query has to see an instance.

## What a predicate sees

A predicate is a bare boolean expression, **not** a lambda. It runs once per
candidate node with that node's own stalk already in scope, so a field name is a
free variable rather than a projection off a bound record. Writing
`\r -> r.age > 21` builds a function value, and a function is not `True`, so the
node is filtered out rather than matched.

Bound in every predicate environment:

| Name | What it holds |
|------|---------------|
| each `extra_fields` key | the node's own scalar fields |
| each labelled child's name | that child's scalar value |
| `self` | the whole stalk as one record, so `self.likes` also resolves |
| `_anchor` | the node's schema anchor, as a string |
| `_id` | the node's numeric id |
| `_value` | the node's own value, when it has one |
| `_children_count` | the number of outgoing arcs |

Where a key collides, `extra_fields` wins over the child scalar.

Two things share the name `self` and are not the same thing. The variable
`self` is a record of the stalk, for field projection. The *string* `"self"`
is what the graph builtins take as a node reference, and it resolves to the
current node id rather than to that record.

```haskell
-- Comparison
age > 21
name == "Alice"
score >= 90.0

-- Logical operators
active && verified
role == "admin" || role == "moderator"
not deleted

-- String matching (contains takes the haystack first, then the needle)
contains (lower lastName) "smith"
slice id 0 5 == "user_"        -- prefix test; slice is slice(s, start, end)

-- Null checks
email /= Nothing

-- The anchor and the fan size are addressable too
_anchor == "post" && _children_count > 0
```

## Projection

`projection` is a list of field names to keep, not an expression. Every match
carries `nodeId`, `anchor`, `value` and `fields`; naming a projection narrows
`fields` to those keys and leaves the rest of the match alone.

```typescript
projection: ['title', 'likes']
```

There is no computed-field slot on a query. Deriving a value belongs in a field
transform on a migration, where the backward direction is defined; see the
field-transforms skill.

## Graph traversal from a predicate

The five graph builtins resolve only under the instance-aware evaluator, which
is what a query predicate runs in. Each takes a **node reference** as its first
argument: either a numeric node id or the string `"self"`, which is the node
currently being tested.

```haskell
-- Follow one edge kind from this node; answers the first matching child,
-- or Nothing when there is none.
edge "self" "prop"

-- Multi-hop, since `edge` answers a node record
edge (edge "self" "record-schema") "prop"

-- Every child, regardless of edge kind
children "self"

-- Presence, arity, and the schema anchor
has_edge "self" "prop"
edge_count "self"
anchor "self"
```

The second argument to `edge` and `has_edge` is the edge **kind**, not the edge
name. In the standard evaluator, with no instance in scope, all five answer
`Nothing`.

## Path navigation

`path` walks edge kinds from the anchor before the predicate runs, which is the
cheaper way to reach a nested node than a chain of `edge` calls in the
predicate: the walk happens once per candidate rather than per evaluation.

```rust
let query = InstanceQuery {
    anchor: "post".into(),
    path: vec!["record-schema".into(), "prop".into()],
    predicate: Some(predicate),
    ..InstanceQuery::default()
};
```

## Fiber operations

Decompose instances along the fibers of a migration. These are free functions
over MessagePack bytes, not `Panproto` methods, and the second argument is the
serialized migration rather than a schema.

```typescript
import { fiberAt, fiberDecomposition } from '@panproto/core';

const fiber = fiberAt(instanceBytes, migrationBytes, 'post:body', p._wasm);
const decomposition = fiberDecomposition(instanceBytes, migrationBytes, p._wasm);
```

## Further Reading

- [Query instances](https://panproto.dev/book/how-to/query-instances.html)
- [Expression language reference](https://panproto.dev/book/reference/expression-language.html)
- [`panproto_inst::query` on docs.rs](https://docs.rs/panproto-inst/latest/panproto_inst/query/index.html)
