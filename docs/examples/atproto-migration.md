# Example: Migrating an ATProto Lexicon Schema

This example walks through evolving an ATProto record schema for a social media post, migrating data between versions, and verifying the round-trip.

## Scenario

You have a Bluesky-style post record. Version 1 has `text` and `createdAt`. Version 2 adds `tags` (optional array) and renames `text` to `content`.

## Step 1: Define v1

```typescript
const proto = p.protocol('atproto');

const v1 = proto.schema()
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

## Step 2: Define v2

```typescript
const v2 = proto.schema()
  .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
  .vertex('post:body', 'object')
  .vertex('post:body.content', 'string')        // renamed from text
  .vertex('post:body.createdAt', 'datetime')
  .vertex('post:body.tags', 'array')             // new field
  .vertex('post:body.tags:items', 'string')
  .edge('post', 'post:body', 'record-schema')
  .edge('post:body', 'post:body.content', 'prop', { name: 'content' })
  .edge('post:body', 'post:body.createdAt', 'prop', { name: 'createdAt' })
  .edge('post:body', 'post:body.tags', 'prop', { name: 'tags' })
  .edge('post:body.tags', 'post:body.tags:items', 'items')
  .constraint('post:body.content', 'maxLength', '3000')
  .constraint('post:body.createdAt', 'required', 'true')
  .build();
```

## Step 3: Diff and classify

```typescript
const diff = p.diff(v1, v2);
const report = p.diffFull(v1, v2);
console.log(report.level);       // 'backward'
console.log(report.reportText());
// Backward-compatible changes:
//   - Added optional vertex "post:body.tags" (array)
//   - Renamed vertex "post:body.text" to "post:body.content"
```

## Step 4: Auto-generate a lens

```typescript
const chain = p.protolensChain(v1, v2);
// Chain: RenameVertex(text, content) + AddVertex(tags, array, [])
```

## Step 5: Migrate data

```typescript
const v1Record = {
  text: "Hello world!",
  createdAt: "2024-01-15T10:00:00Z",
};

const { view, complement } = chain.get(v1Record);
// view = { content: "Hello world!", createdAt: "2024-01-15T10:00:00Z", tags: [] }
// complement = { renames: [{ from: "text", to: "content" }] }
```

## Step 6: Verify round-trip

```typescript
const restored = chain.put(view, complement);
// restored = { text: "Hello world!", createdAt: "2024-01-15T10:00:00Z" }
// Exactly matches the original v1Record

const laws = p.checkLensLaws(chain, v1Record);
console.log(laws.getPut); // true
console.log(laws.putGet); // true
```

## CLI equivalent

```bash
schema diff --src v1.json --tgt v2.json
schema lens generate v1.json v2.json --protocol atproto > lens.json
schema lens apply lens.json record.json --protocol atproto --direction forward
schema lens verify record.json --protocol atproto --schema v1.json
```
