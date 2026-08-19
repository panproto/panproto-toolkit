---
name: cross-protocol
description: >
  Translate schemas and data across protocol boundaries. Covers the universal schema
  graph as intermediate representation, name resolution, construct mapping, and
  translation loss analysis.
---

# Cross-Protocol Translation

You are helping a user translate schemas and data between different protocols (e.g., ATProto Lexicon to GraphQL SDL, Protobuf to JSON Schema).

## How cross-protocol translation works

Every protocol's schemas are represented as the same mathematical structure (a model of a schema theory GAT). Translation works by:

1. **Parse** source data using the source protocol's parser
2. **Represent** as a universal schema graph (vertices, edges, constraints)
3. **Map** vertex/edge kinds from source protocol to target protocol
4. **Emit** in the target format using the target protocol's emitter

The schema graph is the universal intermediate representation. Some constructs translate cleanly; others are approximated or lost.

## Cross-document references

A schema-document parser normally sees one document at a time, so a reference from one document into another (say the ATProto lexicon `pub.layers.annotation.annotationLayer` referencing `pub.layers.defs#spatioTemporalAnchor`) resolves to an opaque `"ref"` placeholder vertex carrying no fields, and a lens has nothing typed to bind to. Parse a whole bundle instead: every document's definitions are registered before any document's structure is parsed, so an in-bundle ref lands on the real, typed vertex, while a ref whose target is in no document of the bundle stays a placeholder (which marks it as genuinely external).

**TypeScript:**
```typescript
const schema = p.parseSchemaBundle('atproto', [annotationLexicon, defsLexicon]);
```

**Python:**
```python
schema = panproto.parse_schema_bundle("atproto", [annotation_lexicon, defs_lexicon])
```

Single-document parsing (`parseLexicon` in TypeScript, `parse_atproto_lexicon` in Python) is unchanged; it is the one-document case of the bundle parser. Cross-document reference resolution currently ships for the `atproto` protocol. Loading a single document under any *other* protocol uses the generic `parseSchemaDocument` / `parseSchemaSource` entry points (see below).

### Keeping per-file provenance (0.64.0+)

`parse_schema_bundle` fuses the whole set into one flat, path-less schema, which is right for a translation endpoint and wrong for anything the version-control layer has to diff file by file. `parse_schema_bundle_project` parses the set as a bundle, so in-set refs still resolve to typed defs, and then partitions the flat schema back by NSID ownership: each vertex and same-file edge returns to the document that declared it, while a ref crossing documents becomes a `<path>::<name>`-prefixed cross-file edge.

```python
project = panproto.parse_schema_bundle_project("atproto", [
    ("lexicons/annotation.json", annotation_lexicon),
    ("lexicons/defs.json", defs_lexicon),
])
project.files()             # [(path, Schema), ...], one leaf per document
project.file_paths()
project.cross_file_edges()  # the refs that crossed a document boundary
```

Note the shape difference: the input is `(path, document)` pairs, not bare documents. `atproto` is the only protocol that retains per-file provenance today (`panproto_protocols::bundle_project_protocols()` in Rust is the list). Feed the result to `panproto_project::build_project_tree` to store a lexicon set as the per-file Merkle tree the VCS diffs incrementally, so a one-file edit reuses every unchanged sibling's object.

## Loading source and target schemas

The compatibility and conversion calls below take *built* schemas (the `srcSchema` / `tgtSchema` handles), so each side of a translation must first be loaded in-process. Every built-in protocol's single-document parser is now reachable directly, so any of the 54 built-in protocols can supply an endpoint. `json-schema`, `graphql`, `sql`, and `protobuf` are first-class semantic protocols again (they were advertised as non-working stubs before, so a cross-protocol lens with a `json-schema` side had no way to obtain the source schema).

Use `parseSchemaDocument` / `parse_schema_document` for a JSON-document protocol (JSON Schema, OpenAPI, Avro, ATProto lexicons, ...) and `parseSchemaSource` / `parse_schema_source` for a text/IDL protocol (SQL DDL, GraphQL SDL, Protobuf `.proto`, CDDL, and the rest). The returned schema is a normal endpoint for `diff`, `convert`, or a lens (the compatibility and translation steps below).

**TypeScript:**
```typescript
// JSON-document side: a JSON Schema
const jsonSchema = p.parseSchemaDocument('json-schema', {
  type: 'object',
  properties: { id: { type: 'string' }, count: { type: 'integer' } },
});

// Text/IDL side: a GraphQL SDL (or 'sql', 'protobuf', ...)
const graphqlSchema = p.parseSchemaSource('graphql', 'type User { id: ID!, name: String }');

// Both are ordinary BuiltSchema handles now; feed them to diff(), convert(), or a lens (below).
const report = p.diff(jsonSchema, graphqlSchema);
```

**Python:**
```python
json_schema = panproto.parse_schema_document("json-schema", {
    "type": "object",
    "properties": {"id": {"type": "string"}, "count": {"type": "integer"}},
})
graphql_schema = panproto.parse_schema_source("graphql", "type User { id: ID!, name: String }")
```

Both raise on an unknown or mismatched protocol: passing a text-source protocol (`sql`, `graphql`, `protobuf`, ...) to the document parser directs you to `parseSchemaSource` / `parse_schema_source`, and vice versa.

One thing worth knowing if you validate a parsed schema against its own protocol. Until 0.70.1 the TypeScript SDK's `p.protocol(name)` consulted a hand-written map of five protocol specs before the WASM registry, and that map had fallen behind: it declared nine ATProto constraint sorts where the Rust definition declares twelve, so a lexicon bundle parsed by panproto's own ATProto parser failed validation against panproto's own ATProto protocol, reporting `invalid-constraint-sort` on every datetime property and every cross-document ref. The map is gone. `protocol()` resolves through the registry for all 54 built-ins and caches per name, and `getBuiltinProtocol(name, wasm)` / `defineBuiltinProtocol(name, wasm)` read the same bytes if you want the spec directly. The hard-coded exports (`ATPROTO_SPEC`, `SQL_SPEC`, `PROTOBUF_SPEC`, `GRAPHQL_SPEC`, `JSON_SCHEMA_SPEC`, `BUILTIN_PROTOCOLS`) were removed with it.

## Step 1: Assess compatibility

Before translating, check what will be preserved:

**CLI:**
```bash
# Structural diff: the two schemas are positional, not --src/--tgt
schema diff source.json target.json --detect-renames

# Classified against a protocol, with exit code 0 clean / 1 breaking / 2 usage error
schema compat source.json target.json --protocol atproto
```

Since 0.70.1 each operand goes through a shared loader, so either command takes panproto's own schema JSON, a single schema document, a source tree, or a project directory. A manifest-backed project is parsed as one bundle, which resolves references across documents and so compares the same assembled schema `schema add` would stage; comparing two versions of a lexicon set is one call rather than a pre-flattening step. On `compat`, whose `--protocol` selects the classifier, a manifest is authoritative about its own protocol and a `--protocol` that disagrees with it is a usage error rather than a silent override.

**TypeScript:**
```typescript
const report = p.diff(srcSchema, tgtSchema);
console.log(report.compatibility); // 'fully-compatible' | 'backward-compatible' | 'breaking'
console.log(report.changes);       // per-construct changes (adds, drops, renames, kind shifts)
```

### Translation quality by protocol pair

| Source | Target | Quality | Notes |
|--------|--------|---------|-------|
| JSON Schema | OpenAPI | High | OpenAPI extends JSON Schema |
| Protobuf | GraphQL | Medium | `oneof` approximated as union, no streaming |
| SQL | JSON Schema | Medium | Foreign keys become `$ref`, indexes lost |
| ATProto | OpenAPI | Medium | NSID becomes path, blob handling differs |
| Avro | Parquet | High | Both columnar-friendly |
| GraphQL | SQL | Low | Recursive types, unions problematic |

### What the two schemas share (0.71.0+)

A diff answers "what changed" and presumes the two schemas are versions of one thing. Across a protocol boundary the prior question is how much of the source has any image in the target at all, and that is what the span search answers. It never refuses: dropping every source vertex is a feasible assignment, so two schemas with nothing in common come back as an empty apex rather than as an exception, where `p.lens` and `p.protolensChain` throw.

**TypeScript:**
```typescript
const span = p.span(protoSchema, graphqlSchema);
span.apex_vertices;   // the shared sub-schema's vertex ids, sorted
span.apex_coverage;   // fraction of the source that found an image
span.is_total;        // whether every source vertex did
span.quality;         // how well the covered part matches, in [0, 1]
span.proven_optimal;  // whether the search proved this is the best span
span.apex_digest;     // content digest of the apex, lower-case hex
```

**Python:**
```python
span = panproto.find_span(proto_schema, graphql_schema, protocol)
span.apex          # the shared sub-schema, as a Schema
span.right         # the migration out of the apex into the target
span.apex_coverage
```

The apex is the sub-schema of the *source* induced on the vertices the search gave a target, which is why it is a schema and not a fragment: `induce` carries every field in its own key space and rebuilds the adjacency indices. Searching with `iso` makes it the *maximum common induced sub-schema*, which is what `discover_overlap` runs since 0.71.0 and what `SchemaSpan::to_overlap` projects to the pair lists a pushout takes.

That word "induced" is load-bearing. Inducing carries every arc between the chosen vertices, so a single self-loop on the target side can make an otherwise shared vertex unshareable, and an empty apex is therefore not evidence that the two schemas share nothing vertex by vertex.

Known correspondences go in as hints (`p.span(src, tgt, { 'User.id': 'users.id' })`, `anchors=` in Python), where the search treats them as pins it may not reconsider. Inferred ones do not: leave the alignment strategies to propose those, since a pin that is individually plausible but jointly infeasible with the rest silently costs the vertex its image.

## Step 2: Translate schemas

**CLI:**
```bash
# schema data convert moves *records* between two schemas of one protocol.
# The CLI resolves only atproto, so a cross-protocol pair is an SDK job.
schema data convert record.json --protocol atproto --from a.json --to b.json -o out.json
```

**TypeScript:**
```typescript
// The SDK converts *data* between the two schemas, auto-generating a lens internally:
const translated = await p.convert(record, { from: srcSchema, to: tgtSchema });
// For a reusable translation, build the lens once with p.lens(srcSchema, tgtSchema).
```

## Step 3: Handle name mapping

Different protocols use different naming conventions:

| Protocol | Convention | Example |
|----------|-----------|---------|
| Protobuf | PascalCase messages, snake_case fields | `UserProfile`, `first_name` |
| GraphQL | PascalCase types, camelCase fields | `UserProfile`, `firstName` |
| SQL | snake_case tables and columns | `user_profile`, `first_name` |
| JSON Schema | varies (often camelCase) | `firstName` |
| ATProto | NSID for types, camelCase fields | `app.bsky.actor.profile`, `displayName` |

The alignment strategies score name similarity across these conventions, so `first_name` and `firstName` pair without being told to. There is no `--rename` flag. Where the automatic answer is wrong, state the correspondence as a hint and let the search optimise around it:

```typescript
const span = p.span(protoSchema, graphqlSchema, {
  'UserProfile.user_name': 'UserProfile.userName',
  'UserMsg': 'User',
});
```

A hint is a caller stating a correspondence rather than a heuristic proposing one, so as of 0.71.0 it reads at the confidence you gave it and is exempt from the requiredness tiebreak that used to shave a 1.0 hint down to 0.95.

## Step 4: Translate data

Convert records through the pair of schemas you loaded above:

```typescript
const avroSchema = p.parseSchemaDocument('avro', avroDoc);
const jsonSchema = p.parseSchemaDocument('json-schema', jsonSchemaDoc);
const record = await p.convert(avroRecord, { from: avroSchema, to: jsonSchema });
```

## Step 5: Understand translation loss

Three categories of fidelity:

### Preserved (lossless)
The construct has a direct equivalent in the target protocol. Examples:
- String field to string field
- Required constraint to required constraint
- Object nesting to object nesting

### Approximated (lossy but usable)
The construct has a close equivalent but with differences. Examples:
- Protobuf `oneof` to GraphQL `union` (semantics differ slightly)
- SQL `CHECK` constraint to JSON Schema `pattern` (not exact)
- ATProto `blob` to OpenAPI `binary` (metadata handling differs)

### Lost (no equivalent)
The construct has no target representation. Examples:
- SQL indexes have no JSON Schema equivalent
- Protobuf service definitions have no JSON Schema equivalent
- GraphQL directives have no Protobuf equivalent

Lost constructs are stored in the complement, so backward translation can restore them.

## Bidirectional translation

Use symmetric lenses for ongoing sync between two protocols:

```typescript
using sym = p.symmetricLens(protoSchema, graphqlSchema);

// Push a change from the left (Protobuf) side to the right (GraphQL) side
const { view: graphqlView, complement } = sym.syncLeftToRight(protoView, sharedComplement);

// Push a change from the right side back to the left
const { view: protoView2 } = sym.syncRightToLeft(graphqlView, complement);
```

Both take a MessagePack-encoded view and the shared complement, and both answer `{ view, complement }`. The handle owns a WASM resource, so dispose it (`using`, or an explicit `[Symbol.dispose]()`).

## Further Reading

- [Tutorial Ch. 11: Cross-Protocol Translation](https://panproto.dev/tutorial/chapters/11-cross-protocol-translation.html)
- [Tutorial Ch. 12: Names Across Protocol Boundaries](https://panproto.dev/tutorial/chapters/12-names-across-protocol-boundaries.html)
