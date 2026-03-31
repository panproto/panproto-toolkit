# Example: Translating SQL to GraphQL

This example shows cross-protocol translation from a SQL DDL schema to a GraphQL SDL schema.

## Scenario

You have a relational database schema (SQL) and need to expose it as a GraphQL API. panproto translates the schema structure and converts data between the two formats.

## Step 1: Define the SQL schema

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

## Step 2: Translate the schema

```bash
schema data convert \
  --src-protocol sql \
  --tgt-protocol graphql \
  --schema-only \
  users.sql
```

Expected output (GraphQL SDL):
```graphql
type User {
  id: Int!
  name: String!
  email: String!
  age: Int
  createdAt: DateTime
  posts: [Post!]!
}

type Post {
  id: Int!
  author: User!
  title: String!
  body: String
  published: Boolean
}
```

## Step 3: Understand the translation

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

## Step 4: Convert data

```bash
# Convert SQL rows to GraphQL-friendly JSON
schema data convert \
  --src-protocol sql \
  --tgt-protocol graphql \
  --src-schema users.sql \
  data.csv
```

## Step 5: Bidirectional sync (TypeScript)

```typescript
const sqlProto = p.protocol('sql');
const gqlProto = p.protocol('graphql');

const sqlSchema = sqlProto.schema()
  .vertex('users', 'table')
  .vertex('users.name', 'column')
  // ... (built from SQL DDL)
  .build();

const gqlSchema = gqlProto.schema()
  .vertex('User', 'object')
  .vertex('User.name', 'field')
  // ... (built from GraphQL SDL)
  .build();

// Create symmetric lens for ongoing sync
const sym = p.symmetricLens(sqlSchema, gqlSchema);

// SQL change propagates to GraphQL
const { updated, complement } = sym.syncAtoB(sqlRecord, currentComplement);

// GraphQL change propagates back to SQL
const { updated: sqlUpdated } = sym.syncBtoA(gqlRecord, complement);
```

## What is lost

SQL indexes, CHECK constraints, DEFAULT values, and UNIQUE constraints have no GraphQL representation. They are stored in the complement so backward translation from GraphQL to SQL can restore them exactly.
