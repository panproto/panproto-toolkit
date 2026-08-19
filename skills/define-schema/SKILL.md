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

panproto supports 54 semantic protocols. As of 0.61.0, `json-schema`, `graphql`, `sql`, and `protobuf` are first-class again (they had been non-working stubs since the v0.17.0 tree-sitter migration): `p.protocol('json-schema')` now returns its real object kinds, so building a `string`, `integer`, or `array` vertex works instead of throwing `unknown vertex kind`. The most common starting points:

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

The 54 protocols are all reachable in-process from the SDKs (`p.protocol(name)`, `panproto.get_builtin_protocol(name)`, `panproto_protocols::<category>::<name>::protocol()`). The `schema` CLI is narrower: its `--protocol` flag resolves `atproto` and nothing else, and exits non-zero naming what is supported on anything else. Reach for an SDK when you need one of the other 53.

## Step 2: Understand the schema graph

A panproto schema is a directed graph where:
- **Vertices** represent schema elements (types, fields, records, objects)
- **Edges** connect vertices (containment, references, properties)
- **Constraints** restrict vertex values (maxLength, required, enum, pattern)

A vertex is `{ id, kind, nsid }`:
- `id`: unique identifier (use dot-separated paths like `post:body.text`)
- `kind`: the vertex type, determined by the protocol (e.g., `record`, `object`, `string`)
- `nsid` (optional): the namespace identifier, e.g. `app.bsky.feed.post` for ATProto. A schema records each NSID twice, on the vertex and in `Schema::nsids`, and the two are kept in step; the builder writes both from the third argument to `vertex`.

An edge is `{ src, tgt, kind, name }`:
- `src` and `tgt`: vertex IDs
- `kind`: the edge type, determined by the protocol (e.g., `record-schema`, `prop`, `ref`)
- `name` (optional): the edge label, e.g. a field name

Those are the field names on the wire, so a serialized schema reads `src`/`tgt`/`name` rather than `source`/`target`/`label`.

## Step 3: Build the schema

A vertex kind has to be one the protocol declares. ATProto, for instance, has no `datetime` kind: a lexicon datetime is a `string` vertex carrying a `format` constraint, and asking for `datetime` raises `SchemaError::UnknownVertexKind`. The per-protocol kind lists are at the bottom of this page.

### CLI
```bash
# Validate an existing schema file
schema validate --protocol atproto schema.json

# Generate test data from an existing schema, by free-model construction
schema scaffold --protocol atproto schema.json
```

`schema scaffold` reads a schema you already have and produces minimal instance data for it. It does not write a schema skeleton; there is no CLI command that does, so start from an SDK builder or from a schema document in the protocol's own language (see *Load instead of build* below).

### TypeScript
```typescript
const proto = p.protocol('atproto');
const schema = proto.schema()
  .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
  .vertex('post:body', 'object')
  .vertex('post:body.text', 'string')
  .vertex('post:body.createdAt', 'string')
  .edge('post', 'post:body', 'record-schema')
  .edge('post:body', 'post:body.text', 'prop', { name: 'text' })
  .edge('post:body', 'post:body.createdAt', 'prop', { name: 'createdAt' })
  .constraint('post:body.text', 'maxLength', '3000')
  .constraint('post:body.createdAt', 'format', 'datetime')
  .build();
```

### Python
```python
proto = panproto.get_builtin_protocol("atproto")
builder = proto.schema()
builder.vertex("post", "record", "app.bsky.feed.post")
builder.vertex("post:body", "object")
builder.vertex("post:body.text", "string")
builder.vertex("post:body.createdAt", "string")
builder.edge("post", "post:body", "record-schema")
builder.edge("post:body", "post:body.text", "prop", "text")
builder.edge("post:body", "post:body.createdAt", "prop", "createdAt")
builder.constraint("post:body.text", "maxLength", "3000")
builder.constraint("post:body.createdAt", "format", "datetime")
schema = builder.build()
```

### Rust
```rust
use panproto_core::{protocols, schema::SchemaBuilder};

let proto = protocols::atproto::protocol();
let schema = SchemaBuilder::new(&proto)
    .vertex("post", "record", Some("app.bsky.feed.post"))?
    .vertex("post:body", "object", None)?
    .vertex("post:body.text", "string", None)?
    .vertex("post:body.createdAt", "string", None)?
    .edge("post", "post:body", "record-schema", None)?
    .edge("post:body", "post:body.text", "prop", Some("text"))?
    .edge("post:body", "post:body.createdAt", "prop", Some("createdAt"))?
    .constraint("post:body.text", "maxLength", "3000")
    .constraint("post:body.createdAt", "format", "datetime")
    .entry("post")
    .build()?;
```

`entry` declares which vertices a reader enters the schema at. It is optional, though a span's apex reports whether it kept one, so a schema you intend to align against another is worth pointing.

### Load instead of build

If the schema already exists in the protocol's own language, load it directly rather than rebuilding it vertex by vertex. The loader returns an ordinary schema, ready to validate, migrate, diff, or use as a lens endpoint.

Use `parseSchemaDocument` / `parse_schema_document` for the JSON-document protocols (JSON Schema, ATProto lexicons, OpenAPI, Avro, and the rest), and `parseSchemaSource` / `parse_schema_source` for the text/IDL protocols (SQL DDL, GraphQL SDL, Protobuf `.proto`, CDDL, Cassandra CQL, and the rest).

**TypeScript**
```typescript
// JSON-document protocol
const schema = p.parseSchemaDocument('json-schema', {
  type: 'object',
  properties: { id: { type: 'string' }, count: { type: 'integer' } },
});

// text/IDL protocol
const gql = p.parseSchemaSource('graphql', 'type User { id: ID!, name: String }');
```

**Python**
```python
schema = panproto.parse_schema_document("json-schema", {
    "type": "object",
    "properties": {"id": {"type": "string"}, "count": {"type": "integer"}},
})

gql = panproto.parse_schema_source("graphql", "type User { id: ID!, name: String }")
```

Passing a protocol the loader does not handle raises (`PanprotoError` in TypeScript, `ValueError` in Python), as does handing a document protocol to `parseSchemaSource` or a text protocol to `parseSchemaDocument`.

## Step 4: Validate

Validation happens in two places, and it is worth knowing which does what.

`.vertex()` and `.edge()` check as you build, and each returns an error at the call that caused it:

| Error | Meaning | Fix |
|-------|---------|-----|
| Unknown vertex kind | The protocol does not define this kind | Check the protocol's allowed vertex kinds |
| Unknown edge kind | The protocol does not define this edge type | Check the protocol's allowed edge kinds |
| Invalid edge source / target | The endpoint's vertex kind is not one this edge kind admits | Check which vertex kinds the edge rule connects |
| Vertex not found | An edge names an endpoint that has not been added | Add the vertex before the edge |
| Duplicate vertex ID | Two vertices share the same ID | Use unique, path-based IDs |

`.build()` adds only the whole-schema checks: an empty schema, and an `entry` naming a vertex the schema does not hold.

Everything else is `validate(&schema, &protocol)` (`schema.validate(protocol)` in Python), which runs against a finished schema and returns its findings as a list rather than failing at a call site. Constraint sorts are checked there and nowhere else, so `.constraint(v, 'required', 'true')` on an ATProto schema builds cleanly and then reports `InvalidConstraintSort`: ATProto has no `required` sort, and required-edge sets are declared with `SchemaBuilder::required` instead. As of 0.71.0 `validate` also reports a recursion point whose marker vertex or whose target vertex the schema does not hold, which used to pass unexamined.

## Step 5: Normalize (optional)

Normalization collapses reference chains and simplifies the schema graph:
```bash
schema normalize --protocol atproto schema.json
```

This is useful when importing schemas from external sources that may have redundant structure. As of 0.71.0 `normalize` carries every conflict-resolution policy across rather than filtering the policy map against surviving vertex ids, and it builds the three adjacency indices in an order derived from its input, so normalizing the same schema twice gives the same answer twice.

## Step 6: Cut a sub-schema (0.71.0+)

`panproto_schema::induce` is the supported way to take part of a schema and get a schema back. It is what a span's apex is built with, and what makes that apex a schema rather than a fragment: it accounts for all twenty-one `Schema` fields in their own key spaces, rebuilds the three adjacency indices rather than copying them, and validates the result against the protocol.

```rust
use std::collections::HashSet;

use panproto_core::gat::Name;
use panproto_core::{protocols, schema::{SchemaBuilder, induce, induce_on_vertices}};

let proto = protocols::atproto::protocol();
let schema = SchemaBuilder::new(&proto)
    .vertex("post", "record", Some("app.bsky.feed.post"))?
    .vertex("post:body", "object", None)?
    .vertex("post:body.text", "string", None)?
    .edge("post", "post:body", "record-schema", None)?
    .edge("post:body", "post:body.text", "prop", Some("text"))?
    .entry("post")
    .build()?;

// Keep a vertex set; every edge between two survivors comes with it.
let keep: HashSet<Name> = ["post", "post:body"].into_iter().map(Name::from).collect();
let sub = induce_on_vertices(&schema, &proto, &keep)?;

// Or name the edges too, to drop an edge whose endpoints both survive.
let keep_e: HashSet<_> = schema.edges.keys().cloned().collect();
let sub = induce(&schema, &proto, &keep, &keep_e)?;
```

Two things follow from the contract. An id naming no vertex is ignored, on every vertex-keyed field and not only on `vertices`, so a parent holding a row filed under an id it has no vertex for cannot pass that dangling reference into the result. And a result that does not validate is reported as `SchemaError::InducedSchemaInvalid` carrying the findings, rather than handed back as a schema. Induction invents nothing, so every such finding was already true of the parent.

## Step 7: Identify a schema by content (0.71.0+)

`canonical_bytes` renders a schema as a stable byte string and `canonical_digest` hashes it, giving a schema a content identity that does not depend on which process built it:

```rust
use panproto_core::schema::canonical_digest;

assert_eq!(canonical_digest(&a), canonical_digest(&b)); // iff a and b are equal as values
```

The digest covers all twenty-one fields, including `entries` and the three adjacency indices, and writes every `Vec` in stored order. That is deliberately stricter than the VCS content hash sitting beside it (`panproto_vcs::hash::CanonicalSchema` covers seventeen fields and normalises): two schemas equal as values hash equal under both, but a schema and its re-indexed twin agree under the VCS hash and differ under this one. Sibling order is observable through `outgoing_edges`, so a consumer reconstructing source text reads it, which is why the span search wants the stricter reading and the VCS does not.

Hosts see the same value without a Rust dependency: a span carries it as `apex_digest`, lower-case hexadecimal, on the TypeScript `SpanResponse`, on Python's `SchemaSpan`, and on the C ABI's span wire.

## Protocol-specific guidance

### ATProto (Lexicon)
- Vertex kinds: `record`, `object`, `array`, `union`, `string`, `integer`, `boolean`, `bytes`, `cid-link`, `blob`, `unknown`, `token`, `query`, `procedure`, `subscription`, `ref`
- Edge kinds: `record-schema`, `prop`, `items`, `variant`, `ref`, `self-ref`
- Constraint sorts: `minLength`, `maxLength`, `minimum`, `maximum`, `maxGraphemes`, `enum`, `const`, `default`, `closed`, `format`, `knownValues`, `ref`
- There is no `datetime` kind: a lexicon datetime is a `string` vertex with `format` set to `datetime`
- Use NSID format for record discriminators: `app.bsky.feed.post`

### OpenAPI
- Vertex kinds: `path`, `operation`, `parameter`, `request-body`, `response`, `schema-object`, `header`, `string`, `integer`, `number`, `boolean`, `array`, `object`
- Edge kinds: `prop`, `items`, `variant`, `ref`

### JSON Schema
- Vertex kinds: `object`, `array`, `string`, `integer`, `boolean`, `unknown`, `not`, `if`, `then`, `else`, `union`
- Edge kinds: `prop`, `items`, `variant`, `ref`, `pattern-prop`

### GraphQL
- Vertex kinds: `type`, `interface`, `input`, `field`, `union`, `enum`, `scalar`, `enum-value`, `subscription`
- Edge kinds: `field-of`, `implements`, `member-of`, `type-of`

### SQL
- Vertex kinds: `table`, `integer`, `string`, `boolean`, `number`, `bytes`, `timestamp`, `date`, `uuid`, `json`
- Edge kinds: `prop`, `foreign-key`

### Protobuf
- Vertex kinds: `message`, `field`, `enum`, `enum-value`, `oneof`, `service`, `rpc`, `map`, `string`, `integer`, `float`, `boolean`
- Edge kinds: `field-of`, `type-of`, `variant-of`

## Further Reading

- [Tutorial Ch. 2: What Schemas Have in Common](https://panproto.dev/tutorial/chapters/02-what-schemas-have-in-common.html)
- [Tutorial Ch. 3: Protocols as Parameters](https://panproto.dev/tutorial/chapters/03-protocols-as-parameters.html)
