# Example: Migrating an ATProto Lexicon Schema

This example walks through evolving an ATProto record schema for a social media post, migrating data between versions, and verifying the round-trip.

## Scenario

You have a Bluesky-style post record. Version 1 has `text` and `createdAt`. Version 2 adds `tags` (optional array) and renames `text` to `content`.

## Step 1: Define v1

ATProto's object kinds are `record`, `object`, `array`, `union`, `string`, `integer`, `boolean`, `bytes`, `cid-link`, `blob`, `unknown`, `token`, `query`, `procedure`, `subscription`, and `ref`. A timestamp is a `string` carrying `format` = `datetime`, not a kind of its own, and requiredness is an edge property recorded with `.required(...)` rather than a constraint.

```typescript
const proto = p.protocol('atproto');

const createdAtEdge = {
  src: 'post:body',
  tgt: 'post:body.createdAt',
  kind: 'prop',
  name: 'createdAt',
};

const v1 = proto.schema()
  .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
  .vertex('post:body', 'object')
  .vertex('post:body.text', 'string')
  .vertex('post:body.createdAt', 'string')
  .edge('post', 'post:body', 'record-schema')
  .edge('post:body', 'post:body.text', 'prop', { name: 'text' })
  .edge('post:body', 'post:body.createdAt', 'prop', { name: 'createdAt' })
  .constraint('post:body.text', 'maxLength', '3000')
  .constraint('post:body.createdAt', 'format', 'datetime')
  .required('post:body', [createdAtEdge])
  .build();
```

The `format` constraint is load-bearing. Compatibility checking honors it, so a `string` with `format=datetime` and a plain `string` are not treated as compatible.

## Step 2: Define v2

```typescript
const v2 = proto.schema()
  .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
  .vertex('post:body', 'object')
  .vertex('post:body.content', 'string')        // renamed from text
  .vertex('post:body.createdAt', 'string')
  .vertex('post:body.tags', 'array')            // new field
  .vertex('post:body.tags:items', 'string')
  .edge('post', 'post:body', 'record-schema')
  .edge('post:body', 'post:body.content', 'prop', { name: 'content' })
  .edge('post:body', 'post:body.createdAt', 'prop', { name: 'createdAt' })
  .edge('post:body', 'post:body.tags', 'prop', { name: 'tags' })
  .edge('post:body.tags', 'post:body.tags:items', 'items')
  .constraint('post:body.content', 'maxLength', '3000')
  .constraint('post:body.createdAt', 'format', 'datetime')
  .required('post:body', [createdAtEdge])
  .build();
```

## Step 3: Diff and classify

```typescript
const diff = p.diff(v1, v2);
console.log(diff.compatibility);           // 'compatible' | 'backward' | 'breaking'
console.log(diff.changes);

const full = p.diffFull(v1, v2);
const compat = full.classify(proto);
console.log(compat.isBackwardCompatible);  // true
console.log(compat.toText());
```

`p.diff` gives the one-line verdict and the change list. `p.diffFull` gives the whole structural diff, and `classify(protocol)` turns it into a `CompatReport` with `isCompatible`, `isBackwardCompatible`, `isBreaking`, `breakingChanges`, `nonBreakingChanges`, `toText()`, and `toJson()`.

## Step 4: Ask what the two versions share

```typescript
const span = p.span(v1, v2);
console.log(span.apex_coverage);   // fraction of v1's vertices with an image in v2
console.log(span.quality, span.quality_bounds);
console.log(span.proven_optimal, span.is_total);
console.log(span.apex_digest);
```

`p.span` never refuses. Where `p.lens` and `p.protolensChain` throw "no morphism found between schemas", this answers with the sub-schema the two versions do share, and two schemas with nothing in common come back with an empty `apex_vertices` and an `apex_coverage` of zero. Read `apex_coverage` alongside `quality`: quality measures how well the *covered* part matches and is normalized by v1, so it ranks spans over one source schema and carries no meaning across pairs.

## Step 5: Generate a lens

```typescript
const chain = p.protolensChain(v1, v2);
// Chain: RenameVertex(text, content) + AddVertex(tags, array, [])

const lens = chain.instantiate(v1);
```

A `ProtolensChainHandle` is a schema-parameterized family. It has to be instantiated at a concrete schema before it can move data, and `instantiate` is what returns the `LensHandle` that does.

## Step 6: Migrate data

```typescript
const v1Record = {
  text: 'Hello world!',
  createdAt: '2024-01-15T10:00:00Z',
};

const { view, complement } = lens.getJson(v1Record, 'post');
// view = { content: 'Hello world!', createdAt: '2024-01-15T10:00:00Z', tags: [] }
```

The second argument names the root vertex the record is read into. The complement is opaque bytes holding everything `get` discarded plus the bookkeeping `put` needs to reassemble the source.

## Step 7: Verify round-trip

```typescript
const restored = lens.putJson(view, complement, 'post');
// restored = { text: 'Hello world!', createdAt: '2024-01-15T10:00:00Z' }

const instance = p.parseJson(v1, JSON.stringify(v1Record));
const laws = lens.checkLaws(instance._bytes);
console.log(laws);       // GetPut and PutGet
```

`PutGet` is checked modulo derived components: a view carrying a computed field is not a free view space, since the field is pinned by the coordinates it was computed from, so a view edited without re-deriving it sits outside the image of `get` and the law cannot be checked strictly against it. `GetPut` stays strict, because its view argument is `get(s)` and is consistent by construction.

When the lens is an isomorphism, a view read back from storage can be sent backward with no complement at all:

```typescript
if (lens.isIsomorphism()) {
  const fromStorage = lens.putJsonWithoutComplement(view, 'post');
} else {
  console.log(lens.isomorphismObstruction());  // the first failing condition
}
```

`isIsomorphism` is a property of the lens rather than of any record, so it answers once for every view the lens will produce. `isomorphismObstruction` returns the first failing condition (a dropped vertex, a dropped edge, or a non-injective value transform) or `null`, so a caller can branch statically instead of catching a throw.

## CLI equivalent

```bash
schema diff v1.json v2.json --detect-renames
schema compat v1.json v2.json --protocol atproto
schema auto-migrate v1.json v2.json
schema lens generate v1.json v2.json --protocol atproto --save lens.json
schema lens apply lens.json record.json --protocol atproto --direction forward
```

Both operands of `diff`, `compat`, and `auto-migrate` are positional, and each may be a schema JSON file, a lexicon document, or a manifest-backed project directory. `schema compat` exits `0` when nothing breaking is found, `1` when something is, and `2` on a usage or load error, which is what makes it usable as a CI gate.
