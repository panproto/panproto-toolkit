---
name: sdk-typescript
description: >
  Complete guide for using panproto via the @panproto/core TypeScript SDK. Covers
  installation, WASM initialization, fluent builder API, handle management, the span
  search, and all SDK operations.
user-invocable: true
---

# TypeScript SDK Guide (@panproto/core)

You are helping a user work with panproto's TypeScript SDK. This is the user-facing guide (not for SDK development).

## Installation

```bash
npm install @panproto/core
# or
pnpm add @panproto/core
```

Requires Node.js 22+ or a modern browser with WASM support.

## Initialization

The SDK loads a WASM module on first use:

```typescript
import { Panproto } from '@panproto/core';

// Async initialization (required before any operations)
const p = await Panproto.init();

// Optional: a WASM URL, or a pre-instantiated glue module
const p = await Panproto.init('/path/to/panproto_wasm_bg.wasm');
```

A host passing its own glue object (a test double, a pre-instantiated module,
a vendored build) must now supply an `auto_generate_span` member. `loadWasm`
reads it directly, so a glue object written against the older shape hands back
`undefined` at run time rather than failing at load.

## Resource cleanup

The SDK uses opaque handles internally. Clean them up with the `using` keyword (TC39 Explicit Resource Management) or `Symbol.dispose`:

```typescript
// Preferred: using keyword (automatic cleanup)
{
  using schema = proto.schema()
    .vertex('post', 'record')
    .build();
  // schema is automatically freed when the block exits
}

// Alternative: manual cleanup
const schema = proto.schema().vertex('post', 'record').build();
try {
  // use schema
} finally {
  schema[Symbol.dispose]();
}
```

A `FinalizationRegistry` provides a safety net for leaked handles, but explicit cleanup is preferred.

## Core classes

### Panproto
The main entry point. Manages WASM module lifecycle.

```typescript
const p = await Panproto.init();

// Access protocols
const proto = p.protocol('atproto');           // built-in protocol
const protocols = p.listProtocols();           // all 54 protocol names

// One-shot operations
const converted = await p.convert(record, { from: oldSchema, to: newSchema });
const diff = p.diff(oldSchema, newSchema);
const fullReport = p.diffFull(oldSchema, newSchema);
```

`p.protocol(name)` resolves through the WASM registry for all 54 built-ins and
caches per name. The hand-written specs that used to shadow it
(`ATPROTO_SPEC`, `SQL_SPEC`, `PROTOBUF_SPEC`, `GRAPHQL_SPEC`,
`JSON_SCHEMA_SPEC`, `BUILTIN_PROTOCOLS`) are no longer exported: they
duplicated definitions that live in `panproto-protocols`, and the duplication
is what let ATProto drift three constraint sorts behind its own Rust
definition. Read a built-in with `getBuiltinProtocol(name, wasm)` or
`p.protocol(name).spec`, both of which read the registry.

### Protocol
Provides schema builders and protocol-specific operations.

```typescript
const proto = p.protocol('atproto');
const builder = proto.schema();  // returns SchemaBuilder
```

### SchemaBuilder
Fluent, immutable builder for schemas.

```typescript
const schema = proto.schema()
  .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
  .vertex('post:body', 'object')
  .vertex('post:body.text', 'string')
  .edge('post', 'post:body', 'record-schema')
  .edge('post:body', 'post:body.text', 'prop', { name: 'text' })
  .constraint('post:body.text', 'maxLength', '3000')
  .build();  // validates and returns BuiltSchema
```

Each method returns a new builder (immutable). `.build()` validates against the protocol and returns the result.

### Loading schemas from documents

Load an existing schema document into a `BuiltSchema` instead of hand-building it. Two name-dispatched loaders reach every one of the 54 built-in protocol parsers (before 0.61.0 only `atproto` was reachable):

- `p.parseSchemaDocument(protocol, doc)` handles the 43 JSON-document protocols (JSON Schema, ATProto lexicons, OpenAPI, Avro, and the rest). `doc` is an object or a JSON string.
- `p.parseSchemaSource(protocol, source)` handles the 11 text/IDL protocols whose source is a language rather than a JSON document: `sql`, `graphql`, `protobuf`, `cddl`, `cassandra`, `neo4j`, `redis`, `asn1`, `bond`, `flatbuffers`, and `conllu`. `source` is the schema text.

```typescript
// JSON-document protocol
const schema = p.parseSchemaDocument('json-schema', {
  type: 'object',
  properties: { id: { type: 'string' }, count: { type: 'integer' } },
});

// Text/IDL protocol
const gqlSchema = p.parseSchemaSource('graphql', 'type Query { hello: String }');
```

Both return a `BuiltSchema` usable anywhere a built schema is (lens generation, `convert()`, `diff()`, or as a migration endpoint), and both throw `PanprotoError` if no parser is registered for `protocol` or the input is not well-formed for it.

### MigrationBuilder
Define migration morphisms.

```typescript
const builder = p.migration(oldSchema, newSchema)
  .map('post:body', 'post:content')
  .mapEdge(
    { src: 'post:body', tgt: 'post:body.text', kind: 'prop', name: 'text' },
    { src: 'post:content', tgt: 'post:content.text', kind: 'prop', name: 'text' },
  );

const report = p.checkExistence(oldSchema, newSchema, builder);
const compiled = builder.compile();
const result = compiled.lift(record);

// The compiled migration is also a lens
const { view, complement } = compiled.get(record);
const restored = compiled.put(view, complement);
```

`map` and `mapEdge` return the builder, so they chain; `compile()` is on the
builder rather than on `Panproto`.

### Lens operations

```typescript
// Auto-generate a schema-independent chain, then instantiate it
const chain = p.protolensChain(oldSchema, newSchema);
const lens = chain.instantiate(oldSchema);

// Get/put over MessagePack bytes
const { view, complement } = lens.get(recordBytes);
const restored = lens.put(modifiedView, complement);

// Or over plain JSON, naming the root vertex
const { view: json, complement: c } = lens.getJson(record, 'post');
const back = lens.putJson(json, c, 'post');

// Reconstruct from a stored view alone, when the lens is an isomorphism
if (lens.isIsomorphism()) {
  const source = lens.putJsonWithoutComplement(storedView, 'post');
} else {
  console.log(lens.isomorphismObstruction());  // the first failing condition
}

// Verify laws (on the lens, not on Panproto)
const laws = lens.checkLaws(instanceBytes);
console.log(laws.getPut, laws.putGet);

// Compose
const composed = p.composeLenses(lensAB, lensBC);
const composedChain = chainAB.compose(chainBC);

// Hint-guided auto-generation (0.26.0+)
const hintedChain = ProtolensChainHandle.autoGenerateWithHintSpec(
  oldSchema,
  newSchema,
  {
    anchors: { 'post': 'article', 'post:body': 'article:content' },
    constraints: [
      { type: 'scope', under: 'post:body', targets: 'article:content' },
      { type: 'exclude_targets', vertices: ['article:legacy'] },
      { type: 'prefer', predicate: { kind: 'similar_name', threshold: 0.6 }, weight: 2.0 },
    ],
    stringency: 'lenient',
  },
  p._wasm,
);
```

Note the argument order: the static helpers on `ProtolensChainHandle` take the
WASM module last. `p._wasm` is the accessor for it.

A `similar_name` preference no longer cuts the search. Its `threshold` reaches
the objective as the weight on the name component, so a candidate scoring below
it is searched and scored lower rather than removed; a hard restriction is
stated as a `scope` or an `exclude_targets` constraint.

### Spans (0.71.0+)

`p.lens` and `p.protolensChain` throw "no morphism found between schemas"
whenever the target dropped anything, which on real schema pairs is the
ordinary case. `p.span` is the call that always answers.

```typescript
const span = p.span(oldSchema, newSchema, { post: 'article' });

console.log(span.apex_vertices);    // sorted vertex ids of the apex
console.log(span.apex_edges);       // sorted edges of the apex
console.log(span.vertex_map);       // the right leg
console.log(span.apex_coverage);    // 0 when the two share nothing
console.log(span.quality, span.quality_bounds);
console.log(span.proven_optimal, span.is_total);
console.log(span.apex_digest);      // a value to key a cache on
```

The response is plain data: the apex arrives as its vertex and edge sets rather
than as a handle, so there is nothing to dispose. `quality` ranks spans over one
source schema and nothing else, so read `apex_coverage` alongside it.
`ProtolensChainHandle.autoGenerateSpan(from, to, wasm, hints?)` is the same call
one level down.

### SymmetricLens
Bidirectional sync between two schema versions.

```typescript
const sym = p.symmetricLens(schemaA, schemaB);
const rightward = sym.syncLeftToRight(leftView, leftComplement);
const leftward = sym.syncRightToLeft(rightView, rightComplement);
```

### IoRegistry
Parse and emit instance data.

```typescript
const io = p.io();
console.log(io.hasProtocol('atproto'));

const instance = io.parse('atproto', schema, jsonData);
const output = io.emit('openapi', schema, instance);
```

Both `parse` and `emit` take the schema, because a codec reads the instance
against the schema it belongs to.

### Repository
Schema version control operations.

```typescript
const repo = p.initRepo('atproto');
const { schemaId } = repo.add(schema);
const head = repo.commit('initial schema', 'you@example.com');
repo.branch('feature');
repo.checkout('feature');
// ... make changes ...
repo.checkout('main');
repo.merge('feature');
const log = repo.log(20);
```

`initRepo` takes the protocol name the lineage tracks, not a filesystem path:
the WASM build keeps its objects in memory. `add` takes the built schema itself
and `commit` takes an author.

### FullDiffReport
Schema diffing with compatibility classification.

```typescript
// The summary diff: a verdict plus a flat change list
const diff = p.diff(oldSchema, newSchema);
console.log(diff.compatibility);  // 'fully-compatible' | 'backward-compatible' | 'breaking'
for (const change of diff.changes) {
  console.log(change.kind, change.path, change.detail);
}

// The full diff, and the classification it supports
const full = p.diffFull(oldSchema, newSchema);
console.log(full.hasChanges);
console.log(full.data.added_vertices, full.data.removed_edges);

const report = full.classify(proto);
console.log(report.isCompatible, report.isBreaking, report.isBackwardCompatible);
console.log(report.breakingChanges);
console.log(report.toText());
console.log(report.toJson());
```

`FullSchemaDiff.added_recursion_points` and `removed_recursion_points` carry
`[markerName, RecursionPoint]` pairs. `RecursionPoint` no longer has a `mu_id`
field: the marker vertex is the key the point is filed under, and naming it
twice made the two copies independently settable.

### GAT operations (advanced)

These are free functions rather than `Panproto` methods, and each takes the
WASM module last.

```typescript
import { createTheory, colimit, checkMorphism, migrateModel } from '@panproto/core';

const theory = createTheory({ name: 'MyTheory', sorts: [...], ops: [...] }, p._wasm);
const composed = colimit(theoryA, theoryB, shared, p._wasm);
const result = checkMorphism(morphism, domain, codomain, p._wasm);
```

### Expression evaluation

```typescript
import { parseExpr, evalExpr, formatExpr } from '@panproto/core';

const expr = parseExpr('\\x -> x + 1', p._wasm);
const applied = evalExpr(expr, { x: { type: 'int', value: 5 } }, p._wasm);
const canonical = formatExpr('\\x -> x+1', p._wasm);
```

`evalExpr` takes the parsed AST rather than a source string, and its
environment maps variable names to `Literal` values.

### Query

```typescript
import { executeQuery, ExprBuilder } from '@panproto/core';

const matches = executeQuery(
  {
    anchor: 'post',
    // The node's own stalk is the environment, so `likes` binds directly.
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
  console.log(m.nodeId, m.fields);
}
```

The query comes first, then the instance, then the WASM module. A query is a
structural selection over the instance graph (`anchor`, optional `path`,
`predicate`, `groupBy`, `projection`, `limit`), and its predicate is an
expression AST built with `ExprBuilder`, not a lambda source string.

## Error handling

All errors throw typed `PanprotoError` subclasses: `WasmError`,
`SchemaValidationError`, `MigrationError`, `ExistenceCheckError`. Match on the
class rather than on a code; `PanprotoError` carries a message and a `cause`,
not a code enum.

```typescript
import { PanprotoError, SchemaValidationError } from '@panproto/core';

try {
  const schema = proto.schema().vertex('bad', 'nonexistent').build();
} catch (e) {
  if (e instanceof SchemaValidationError) {
    console.log(e.errors);   // the individual validation failures
  } else if (e instanceof PanprotoError) {
    console.log(e.message);  // human-readable
    console.log(e.cause);    // the underlying WASM error, when there is one
  }
}
```

## Further Reading

- [TypeScript SDK reference](https://panproto.dev/book/reference/sdk-typescript.html)
- [Install panproto for TypeScript](https://panproto.dev/book/how-to/install/typescript.html)
- [Define a schema from TypeScript](https://panproto.dev/book/how-to/define-schema/typescript.html)
- [Find a span between two schemas](https://panproto.dev/book/how-to/spans.html)
- [`@panproto/core` on npm](https://www.npmjs.com/package/@panproto/core)
