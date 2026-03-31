---
name: define-schema
description: >
  Guide for defining schemas using panproto. Covers protocol selection, vertex/edge
  construction via SchemaBuilder, constraints, and validation. Works with CLI,
  TypeScript, Python, or Rust.
argument-hint: "<protocol: atproto|openapi|avro|protobuf|sql|graphql|json-schema|...>"
---

# Defining Schemas

You are helping a user define a schema using panproto. The argument specifies which protocol to use. If omitted, help them choose.

## Step 1: Choose a protocol

panproto supports 50 semantic protocols. The most common starting points:

| Protocol | Best for | Schema language |
|----------|----------|----------------|
| `atproto` | Social/decentralized apps | Lexicon (JSON) |
| `openapi` | REST APIs | OpenAPI 3.x (YAML/JSON) |
| `avro` | Event streaming | Avro Schema (JSON) |
| `protobuf` | RPC services | Protocol Buffers (.proto) |
| `sql` | Relational databases | SQL DDL |
| `graphql` | Graph APIs | GraphQL SDL |
| `json-schema` | Data validation | JSON Schema |
| `parquet` | Columnar analytics | Parquet schema |
| `arrow` | In-memory analytics | Arrow schema |

Each protocol is a pair of GATs (Generalized Algebraic Theories) that define the valid vertex kinds, edge kinds, and constraints. The SchemaBuilder enforces these rules as you build.

## Step 2: Understand the schema graph

A panproto schema is a directed graph where:
- **Vertices** represent schema elements (types, fields, records, objects)
- **Edges** connect vertices (containment, references, properties)
- **Constraints** restrict vertex values (maxLength, required, enum, pattern)

Each vertex has:
- `id`: unique identifier (use dot-separated paths like `post:body.text`)
- `kind`: the vertex type, determined by the protocol (e.g., `record`, `object`, `string`)
- `discriminator` (optional): protocol-specific qualifier (e.g., NSID for ATProto)

Each edge has:
- `source` and `target`: vertex IDs
- `kind`: the edge type, determined by the protocol (e.g., `record-schema`, `prop`, `ref`)
- `label` (optional): edge name (e.g., field name)

## Step 3: Build the schema

### CLI
```bash
# Validate an existing schema file
schema validate --protocol atproto schema.json

# Generate a skeleton to start from
schema scaffold --protocol atproto my-schema.json
```

### TypeScript
```typescript
const proto = p.protocol('atproto');
const schema = proto.schema()
  .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
  .vertex('post:body', 'object')
  .vertex('post:body.text', 'string')
  .vertex('post:body.createdAt', 'datetime')
  .edge('post', 'post:body', 'record-schema')
  .edge('post:body', 'post:body.text', 'prop', { name: 'text' })
  .edge('post:body', 'post:body.createdAt', 'prop', { name: 'createdAt' })
  .constraint('post:body.text', 'maxLength', '3000')
  .constraint('post:body.createdAt', 'required', 'true')
  .build();
```

### Python
```python
proto = panproto.get_builtin_protocol("atproto")
builder = proto.schema()
builder.vertex("post", "record", "app.bsky.feed.post")
builder.vertex("post:body", "object")
builder.vertex("post:body.text", "string")
builder.vertex("post:body.createdAt", "datetime")
builder.edge("post", "post:body", "record-schema")
builder.edge("post:body", "post:body.text", "prop", "text")
builder.edge("post:body", "post:body.createdAt", "prop", "createdAt")
builder.constraint("post:body.text", "maxLength", "3000")
builder.constraint("post:body.createdAt", "required", "true")
schema = builder.build()
```

### Rust
```rust
let proto = panproto_protocols::atproto::protocol();
let schema = schema::SchemaBuilder::new(&proto)
    .vertex("post", "record", Some("app.bsky.feed.post"))?
    .vertex("post:body", "object", None)?
    .vertex("post:body.text", "string", None)?
    .vertex("post:body.createdAt", "datetime", None)?
    .edge("post", "post:body", "record-schema", None)?
    .edge("post:body", "post:body.text", "prop", Some("text"))?
    .edge("post:body", "post:body.createdAt", "prop", Some("createdAt"))?
    .constraint("post:body.text", "maxLength", "3000")
    .constraint("post:body.createdAt", "required", "true")
    .build()?;
```

## Step 4: Validate

The `.build()` call validates incrementally against the protocol's schema theory. Common validation errors:

| Error | Meaning | Fix |
|-------|---------|-----|
| Unknown vertex kind | The protocol does not define this kind | Check the protocol's allowed vertex kinds |
| Unknown edge kind | The protocol does not define this edge type | Check the protocol's allowed edge kinds |
| Edge arity mismatch | Source/target vertex kinds are wrong for this edge kind | Check which vertex kinds can be connected |
| Missing required edge | The protocol requires certain edges from this vertex kind | Add the missing edge |
| Duplicate vertex ID | Two vertices share the same ID | Use unique, path-based IDs |

## Step 5: Normalize (optional)

Normalization collapses reference chains and simplifies the schema graph:
```bash
schema normalize --protocol atproto schema.json
```

This is useful when importing schemas from external sources that may have redundant structure.

## Protocol-specific guidance

### ATProto (Lexicon)
- Vertex kinds: `record`, `object`, `array`, `string`, `integer`, `boolean`, `datetime`, `blob`, `bytes`, `cid-link`, `ref`, `union`, `token`, `unknown`
- Edge kinds: `record-schema`, `prop`, `items`, `ref-target`, `union-member`
- Use NSID format for record discriminators: `app.bsky.feed.post`

### OpenAPI
- Vertex kinds: `schema`, `object`, `array`, `string`, `integer`, `number`, `boolean`, `path`, `operation`, `parameter`, `response`
- Edge kinds: `property`, `items`, `parameter`, `response`, `request-body`

### SQL
- Vertex kinds: `table`, `column`, `index`, `constraint`, `view`
- Edge kinds: `has-column`, `references`, `has-index`

### Protobuf
- Vertex kinds: `message`, `field`, `enum`, `enum-value`, `oneof`, `service`, `rpc`
- Edge kinds: `has-field`, `has-enum-value`, `has-oneof`, `field-type`

## Further Reading

- [Tutorial Ch. 2: What Schemas Have in Common](https://panproto.dev/tutorial/chapters/02-what-schemas-have-in-common.html)
- [Tutorial Ch. 3: Protocols as Parameters](https://panproto.dev/tutorial/chapters/03-protocols-as-parameters.html)
