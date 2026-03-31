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

## Step 1: Assess compatibility

Before translating, check what will be preserved:

**CLI:**
```bash
schema diff --src source.json --tgt target.json
```

**TypeScript:**
```typescript
const report = p.crossProtocolCompatibility(srcSchema, tgtSchema, srcProto, tgtProto);
console.log(report.preserved);     // constructs that translate cleanly
console.log(report.approximated);  // constructs with approximate mapping
console.log(report.lost);          // constructs with no target equivalent
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

## Step 2: Translate schemas

**CLI:**
```bash
schema data convert \
  --from protobuf \
  --to graphql \
  service.proto
```

**TypeScript:**
```typescript
const translated = p.convertSchema(srcSchema, srcProto, tgtProto);
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

panproto handles name translation automatically based on protocol conventions. Override specific names when needed:

```bash
schema data convert \
  --from protobuf \
  --to graphql \
  --rename "user_name=userName" \
  --rename "UserMsg=User" \
  service.proto
```

## Step 4: Translate data

```bash
schema data convert \
  --from avro \
  --to json-schema \
  --protocol avro \
  data.avro
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
const sym = p.symmetricLens(protoSchema, graphqlSchema);

// Push a change from Protobuf side to GraphQL side
const { updated, complement } = sym.syncAtoB(protoRecord, currentComplement);

// Push a change from GraphQL side back to Protobuf side
const { updated: protoUpdated } = sym.syncBtoA(graphqlRecord, complement);
```

## Further Reading

- [Tutorial Ch. 11: Cross-Protocol Translation](https://panproto.dev/tutorial/chapters/11-cross-protocol-translation.html)
- [Tutorial Ch. 12: Names Across Protocol Boundaries](https://panproto.dev/tutorial/chapters/12-names-across-protocol-boundaries.html)
