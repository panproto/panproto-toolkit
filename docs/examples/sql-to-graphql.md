# Example: Translating SQL to GraphQL

This example shows cross-protocol translation from a SQL DDL schema to a GraphQL SDL schema.

## Scenario

You have a relational database schema (SQL) and need to expose it as a GraphQL API. panproto translates the schema structure and converts data between the two formats.

## Step 1: Write the SQL schema

```bash
cat > users.sql << 'EOF'
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  age INTEGER CHECK (age >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  published BOOLEAN DEFAULT false
);
EOF
```

## Step 2: Load both schemas

SQL DDL and GraphQL SDL are text protocols, so both go through the source loader rather than the document loader. Since v0.61.0 all four of json-schema, graphql, sql, and protobuf are first-class semantic protocols again, so `p.protocol('sql')` returns real object kinds rather than a stub.

```typescript
import { readFileSync } from 'node:fs';

const sqlSchema = p.parseSchemaSource('sql', readFileSync('users.sql', 'utf8'));
const gqlSchema = p.parseSchemaSource('graphql', readFileSync('api.graphql', 'utf8'));
```

The eleven text protocols reachable this way are SQL DDL, GraphQL SDL, Protobuf, CDDL, Cassandra CQL, Cypher, ASN.1, Bond, FlatBuffers, and CoNLL-U. The forty-three JSON-document protocols go through `parseSchemaDocument(protocol, doc)` instead; passing one to the wrong loader is redirected rather than silently mis-parsed.

Hand-building either side works too, but the kinds have to be the protocol's own. SQL's object kinds are `table`, `integer`, `string`, `boolean`, `number`, `bytes`, `timestamp`, `date`, `uuid`, and `json`, with edge kinds `prop` and `foreign-key`. GraphQL's are `type`, `interface`, `input`, `field`, `union`, `enum`, `scalar`, `enum-value`, and `subscription`, with edge kinds `field-of`, `implements`, `member-of`, and `type-of`.

```typescript
const sqlProto = p.protocol('sql');
const gqlProto = p.protocol('graphql');

const users = sqlProto.schema()
  .vertex('users', 'table')
  .vertex('users.name', 'string')
  .vertex('users.age', 'integer')
  .edge('users', 'users.name', 'prop', { name: 'name' })
  .edge('users', 'users.age', 'prop', { name: 'age' })
  .constraint('users.name', 'NOT NULL', 'true')
  .build();

const userType = gqlProto.schema()
  .vertex('User', 'type')
  .vertex('User.name', 'field')
  .vertex('User.age', 'field')
  .edge('User', 'User.name', 'field-of', { name: 'name' })
  .edge('User', 'User.age', 'field-of', { name: 'age' })
  .constraint('User.name', 'non_null', 'true')
  .build();
```

## Step 3: Measure the overlap

```typescript
const span = p.span(sqlSchema, gqlSchema);
console.log(span.apex_coverage);   // how much of the SQL schema has a GraphQL image
console.log(span.apex_vertices);
console.log(span.quality, span.quality_bounds, span.proven_optimal);
```

This is the call to reach for on a cross-protocol pair. It never refuses: two schemas with nothing in common come back with an empty apex and an `apex_coverage` of zero, where `p.lens` and `p.protolensChain` would throw. Quality is normalized by the source, so run the search in both directions and compare the two coverage fractions rather than the two quality numbers.

An empty apex is a stronger statement than "no vertex is shared". The apex is an *induced* sub-schema, so it carries every arc between the vertices it holds; a vertex that agrees on kind and name is still unshareable when the target's copy carries an arc the source's does not.

## Step 4: Understand the translation

| SQL construct | GraphQL equivalent | Fidelity |
|--------------|-------------------|----------|
| `TABLE` | `type` | Preserved |
| `VARCHAR(N)` | `String` | Approximated (length lost) |
| `INTEGER` | `Int` | Preserved |
| `NOT NULL` | `!` (non-null) | Preserved |
| `REFERENCES` | Nested type | Preserved (foreign key becomes relationship) |
| `CHECK` constraint | (none) | Lost (stored in complement) |
| `UNIQUE` constraint | (none) | Lost (stored in complement) |
| `DEFAULT` value | (none) | Lost (stored in complement) |
| `PRIMARY KEY` | `id` field convention | Approximated |

The three constraint sorts SQL has and GraphQL does not (`CHECK`, `UNIQUE`, `DEFAULT`) are the reason the translation is not an isomorphism. `lens.isomorphismObstruction()` names the first of them, so a caller can decide statically whether a stored GraphQL view can be sent back to SQL without a complement.

## Step 5: Convert data

This one is an SDK job. The `schema` CLI resolves one protocol, `atproto`; sql and graphql are among the fifty-three built-ins reachable only through the SDKs, so `schema lens generate --protocol sql` exits with `unknown protocol`.

```typescript
const chain = p.protolensChain(sqlSchema, gqlSchema);
const lens = chain.instantiate(sqlSchema);

const { view, complement } = lens.getJson(sqlRow, 'users');
const back = lens.putJson(view, complement, 'users');
```

The equivalent CLI shape, for an ATProto pair where it does resolve, is:

```bash
schema lens generate old.json new.json --protocol atproto --save chain.json
schema data convert rows.json --protocol atproto --chain chain.json --output out/
```

`schema data convert` takes the data path positionally and the schemas as `--from` and `--to`, or a pre-built chain as `--chain`. Add `--direction backward` with the stored complement to go the other way, and `--defaults key=value,...` for fields the target requires that the source does not carry.

## Step 6: Bidirectional sync (TypeScript)

```typescript
const sym = p.symmetricLens(sqlSchema, gqlSchema);

// A SQL-side change propagates to GraphQL.
const toGql = sym.syncLeftToRight(sqlViewBytes, complementBytes);

// A GraphQL-side change propagates back to SQL.
const toSql = sym.syncRightToLeft(gqlViewBytes, toGql.complement);
```

A symmetric lens treats both schemas as peers rather than distinguishing a source and a view, and each side's private information lives in the shared complement. Its middle schema is now the apex of a span search rather than a hand-assembled name match, so two schemas that share no vertex *name* still sync on whatever structure they share; the construction refuses only when the optimal apex is empty, which takes two schemas whose kinds are disjoint.

## What is lost

SQL indexes, CHECK constraints, DEFAULT values, and UNIQUE constraints have no GraphQL representation. They are stored in the complement so backward translation from GraphQL to SQL can restore them exactly.
