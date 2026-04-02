---
name: sdk-typescript
description: >
  Complete guide for using panproto via the @panproto/core TypeScript SDK. Covers
  installation, WASM initialization, fluent builder API, handle management, and all
  SDK operations.
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

// Optional: provide a custom WASM URL
const p = await Panproto.init({ wasmUrl: '/path/to/panproto_wasm_bg.wasm' });
```

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
const protocols = p.listProtocols();           // all 50 protocol names

// One-shot operations
const converted = p.convert(record, oldSchema, newSchema);
const diff = p.diff(oldSchema, newSchema);
const fullReport = p.diffFull(oldSchema, newSchema);
```

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

### MigrationBuilder
Define migration morphisms.

```typescript
const migration = p.migrationBuilder(oldSchema, newSchema)
  .map('post:body.text', 'post:content.text')
  .mapEdge('post:body->post:body.text', 'post:content->post:content.text')
  .build();

const report = p.checkExistence(oldSchema, newSchema, migration);
const compiled = p.compileMigration(oldSchema, newSchema, migration);
const result = compiled.lift(record);
```

### Lens operations

```typescript
// Auto-generate
const chain = p.protolensChain(oldSchema, newSchema);
const result = chain.apply(record);

// Get/put
const { view, complement } = chain.get(record);
const restored = chain.put(modifiedView, complement);

// Verify laws
const laws = p.checkLensLaws(chain, testInstance);
console.log(laws.getPut, laws.putGet);  // true, true

// Compose
const composed = p.composeLenses(chainAB, chainBC);

// Hint-guided auto-generation (0.26.0+)
const hintedChain = p.protolensChainWithHints(oldSchema, newSchema, {
  anchors: { 'post': 'article', 'post:body': 'article:content' },
  constraints: [
    { type: 'scope', under: 'post:body', targets: 'article:content' },
    { type: 'exclude_targets', vertices: ['article:legacy'] },
    { type: 'prefer', predicate: { kind: 'similar_name', threshold: 0.6 }, weight: 2.0 },
  ],
});
```

### SymmetricLens
Bidirectional sync between two schema versions.

```typescript
const sym = p.symmetricLens(schemaA, schemaB);
const { updated, newComplement } = sym.sync(recordA, complementA);
```

### IoRegistry
Parse and emit instance data.

```typescript
const io = p.ioRegistry();
const protocols = io.listProtocols();

const instance = io.parse('atproto', jsonData);
const output = io.emit('openapi', instance);
```

### VcsRepository
Schema version control operations.

```typescript
const repo = p.vcsInit('/path/to/project');
repo.add('schemas/post.json');
repo.commit('initial schema');
repo.branch('feature');
repo.checkout('feature');
// ... make changes ...
repo.checkout('main');
repo.merge('feature');
const log = repo.log();
```

### FullDiffReport
Schema diffing with compatibility classification.

```typescript
const diff = p.diff(oldSchema, newSchema);
console.log(diff.added);    // added vertices/edges
console.log(diff.removed);  // removed vertices/edges
console.log(diff.changed);  // modified constraints

const report = p.diffFull(oldSchema, newSchema);
console.log(report.level);       // 'compatible' | 'backward' | 'breaking'
console.log(report.reportText()); // human-readable summary
```

### GAT operations (advanced)

```typescript
// Create and compose theories
const theory = p.createTheory({ name: 'MyTheory', sorts: [...], ops: [...] });
const composed = p.colimitTheories(theoryA, theoryB, shared);
const valid = p.checkMorphism(morphism);
```

### Expression evaluation

```typescript
const result = p.evalExpr('2 + 3 * 4');         // 14
const fn = p.parseExpr('\\x -> x + 1');
const applied = p.evalExpr(fn, { x: 5 });        // 6
```

### Query

```typescript
import { executeQuery } from '@panproto/core';

const results = executeQuery(instance, schema, {
  filter: '\\row -> row.age > 21',
  project: ['name', 'email'],
});
```

## Error handling

All errors throw typed `PanprotoError` subclasses:

```typescript
try {
  const schema = proto.schema().vertex('bad', 'nonexistent').build();
} catch (e) {
  if (e instanceof PanprotoError) {
    console.log(e.code);    // 'UNKNOWN_VERTEX_KIND'
    console.log(e.message); // human-readable
  }
}
```

## Further Reading

- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html) (TypeScript examples)
- [@panproto/core API Reference](https://panproto.dev/ts-docs/)
