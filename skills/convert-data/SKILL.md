---
name: convert-data
description: >
  Convert data between formats using panproto. Covers the parse/schema/migrate/emit
  pipeline, cross-protocol translation, and batch data operations.
argument-hint: "<from-protocol> <to-protocol>"
---

# Converting Data

You are helping a user convert data between formats. panproto supports 54 protocols and 50+ I/O codecs. The conversion pipeline is: parse, represent as schema graph, migrate, emit.

The JSON, XML, YAML, TOML, and CSV codecs are value-preserving: parsing an instance and re-emitting it keeps the structure the protocol layer round-trips on, so a migration over a YAML, TOML, or CSV file keeps its shape instead of losing it to a bare re-serialization.

## Step 1: Identify source and target

Ask the user for:
1. Source format/protocol (e.g., `json-schema`, `avro`, `protobuf`)
2. Target format/protocol (e.g., `openapi`, `sql`, `graphql`)
3. The data to convert (file path or inline)

To see all available protocols:

```typescript
p.listProtocols();      // the 54 semantic protocols
p.io().protocols;       // the I/O codecs registered on the WASM build
```

```python
panproto.list_builtin_protocols()
list(panproto.IoRegistry().list_protocols())
```

The `schema` CLI has no protocol listing, and its `--protocol` flag resolves `atproto` and nothing else. Every CLI step below is therefore an ATProto step; the SDK paths reach all 54.

### Loading the endpoint schemas

The pipeline needs a source schema and a target schema. As of 0.61.0 you can load either directly from a schema document written in its protocol's own language, rather than hand-building it (before 0.61.0 only ATProto lexicons could be loaded). Use `parseSchemaDocument` / `parse_schema_document` for the JSON-document protocols (JSON Schema, OpenAPI, Avro, ATProto lexicons, and the rest), and `parseSchemaSource` / `parse_schema_source` for the text/IDL protocols (SQL DDL, GraphQL SDL, Protobuf `.proto`, and the rest).

**TypeScript**
```typescript
const srcSchema = p.parseSchemaDocument('json-schema', jsonSchemaDoc);
const tgtSchema = p.parseSchemaSource('graphql', graphqlSdl);
```

**Python**
```python
src_schema = panproto.parse_schema_document("json-schema", json_schema_doc)
tgt_schema = panproto.parse_schema_source("graphql", graphql_sdl)
```

Each returns an ordinary schema, usable as the `srcSchema` / `tgtSchema` endpoint in the steps below. An unknown or mismatched protocol raises (`PanprotoError` in TypeScript, `ValueError` in Python).

## Step 2: Single record conversion

### CLI
```bash
# --from and --to are the two schema JSON files, not protocol names;
# --protocol names the protocol both are written against.
schema data convert record.json \
  --protocol atproto \
  --from old-schema.json \
  --to new-schema.json \
  --output converted.json
```

The command auto-generates a lens between the two schemas and runs every record through it. `--direction backward` runs the same lens the other way, `--defaults k=v,k=v` supplies values for fields the target adds, and `--chain chain.json` substitutes a protolens chain you built earlier for the generated one (it still needs `--from`/`--to`, to instantiate the chain against concrete schemas). Omitting both `--chain` and the `--from`/`--to` pair is an error; there is no auto-discovery.

### TypeScript
```typescript
const p = await Panproto.init();

// srcSchema / tgtSchema are BuiltSchema handles: see "Loading the endpoint
// schemas" above, or build them with proto.schema().
const converted = await p.convert(sourceData, { from: srcSchema, to: tgtSchema });
```

`convert` generates a lens, runs `get`, and returns the view, disposing the lens for you. When you are converting more than one record, build the lens once and keep it:

```typescript
using lens = p.lens(srcSchema, tgtSchema);
const { view, complement } = lens.get(recordBytes);
```

To go through the I/O codecs instead, so the bytes are in each protocol's own wire format:

```typescript
const io = p.io();
const srcInstance = io.parse('atproto', srcSchema, sourceBytes);
// ... map through a lens ...
const outputBytes = io.emit('openapi', tgtSchema, viewInstance);
```

### Python
```python
import panproto

registry = panproto.IoRegistry()
src_instance = registry.parse("atproto", src_schema, source_bytes)

lens, quality, seed_anchors = panproto.auto_generate_lens(src_schema, tgt_schema, proto)
view, complement = lens.get(src_instance)

output = registry.emit("openapi", tgt_schema, view)
```

### Rust
```rust
use panproto_core::{io, lens, protocols};

let src_proto = protocols::data_schema::cddl::protocol();

let registry = io::default_registry();
let src_instance = registry.parse_wtype("cddl", &src_schema, &source_data)?;
let config = lens::AutoLensConfig::default();
let result = lens::auto_generate(&src_schema, &tgt_schema, &src_proto, &config)?;
let (view, _complement) = lens::get(&result.lens, &src_instance)?;
let output = registry.emit_wtype("openapi", &tgt_schema, &view)?;
```

### When no lens can be generated (0.71.0+)

`p.lens` and `p.protolensChain` refuse when the search finds no alignment, and "no morphism found between schemas" is what a caller sees. Ask for a span instead. It never refuses, because dropping every source vertex is always a feasible answer, so two schemas with nothing in common come back with an empty apex rather than as an exception:

```typescript
const span = p.span(srcSchema, tgtSchema);
span.apex_coverage;   // fraction of source vertices that found an image; 0 means nothing shared
span.is_total;        // true exactly when the span covers the whole source
span.quality;         // how well the covered part matches, in [0, 1]
span.quality_bounds;  // [lower, upper]; equal iff proven_optimal
span.vertex_map;      // the right leg: source vertex id -> target vertex id
span.apex_digest;     // content digest of the apex; a key a cache can use
```

Pass known correspondences as a third argument (`p.span(src, tgt, { 'post:body.text': 'entry:content' })`); the search treats them as hard pins it may not reconsider. Python's equivalent is `panproto.find_span(src, tgt, protocol, anchors=...)`, which returns a `SchemaSpan` carrying `apex`, `left`, `right`, and the same measurements; note that it takes a `Protocol`, because the apex is itself a schema and a schema is well formed only against one.

Two 0.71.0 changes make `p.lens` itself cover more even when it does answer. It no longer short-circuits as soon as the pinned search maps every source vertex, so a released search that finds a higher-quality alignment over the same vertices is now compared against the pinned one and can win; and the three scans that used to pre-exclude source vertices they judged infeasible are gone, since the search decides that question exactly and the scans were stricter than it. Fields that used to disappear from a generated lens at the more permissive tiers now survive.

## Step 3: Batch conversion

### Directory of files
`schema data convert` takes a directory as readily as a single file, and writes one output per input:

```bash
schema data convert records/ \
  --protocol atproto \
  --from old-schema.json \
  --to new-schema.json \
  --output converted/
```

### With VCS integration
`schema data migrate` is the other batch path, and it is the one that reads schema history rather than two schema files. It needs a repository: it resolves the schemas from commits and chains the recorded migrations between them.

```bash
# Migrate every record in the directory from the parent commit to HEAD
schema data migrate records/

# Pick the range, preview it, or write elsewhere
schema data migrate records/ --range <old>..<new> --dry-run
schema data migrate records/ --output migrated/ --coverage

# Backward, which needs the stored complement
schema data migrate records/ --backward
```

There is no `--src-schema` / `--tgt-schema` pair on this command; naming two schemas directly is what `convert` is for.

## Step 4: Cross-protocol translation

Converting between different protocols (say Protobuf to GraphQL) is the same call with endpoints loaded from two different protocols. Load each side with `parseSchemaSource` / `parseSchemaDocument` (Step 1), then convert:

```typescript
const protoSchema = p.parseSchemaSource('protobuf', protoIdl);
const gqlSchema = p.parseSchemaSource('graphql', graphqlSdl);
const translated = await p.convert(message, { from: protoSchema, to: gqlSchema });
```

The CLI cannot do this pair: its `--protocol` resolves `atproto` alone, and the flag names one protocol for both endpoints.

Cross-protocol translation may involve:
- **Construct mapping**: some source constructs may not exist in the target (e.g., Protobuf `oneof` has no direct GraphQL equivalent)
- **Name resolution**: naming conventions differ across protocols
- **Type coercion**: type systems may not align exactly

Nothing prints a single "conversion report". What each construct cost you is read off three places: the span's `apex_coverage` and `quality` say how much of the source found an image and how well it matched, `schema lens generate --requirements` lists the defaults and complement data the generated lens needs to run, and the complement `get` hands back holds whatever the forward direction discarded.

## Step 5: Schema-to-schema alignment

`schema data convert` converts *records*; handing it a schema file converts that file as though it were a record. To ask how one schema maps onto another, run the span search instead:

```bash
schema auto-migrate old-schema.json new-schema.json
```

It prints the apex size, the fraction of the source it covers, and the interval the search proved the quality lies in. Three flags form a strictness ladder over that one search: `--total` accepts only a span covering every source vertex, the default accepts any span covering at least one, and `--span` accepts an empty apex as the answer that the two schemas share nothing. `--monic` is orthogonal to all three and asks for an injective vertex map. `--json` writes the span's right leg, a migration out of the apex, whose declared domain is the apex digest rather than the source schema.

Two 0.71.0 changes matter here. `--total` used to report that no total morphism exists on pairs that have one, because it rejected the span whenever the span was partial, and an optimal partial span is no evidence at all about existence: span quality excludes the drop count while the objective is lexicographic in `(quality, drops)`, so a span that drops a vertex can score strictly better than a total morphism that keeps it. It now falls back to the total-morphism search on exactly the pairs where it used to bail. And a right leg that identifies two source vertices is now reported on stderr, which keeps stdout pipeable under `--json`: such a migration is not one a lift can carry out, since both fields' data would arrive under the survivor's name.

## Step 6: Inspect I/O codecs

To see the codecs the build registered:

**TypeScript:**
```typescript
const io = p.io();
console.log(io.protocols);   // a getter, cached after the first read
// ['atproto', 'openapi', 'avro', 'protobuf', 'sql', 'graphql', ...]
console.log(io.hasProtocol('avro'));
```

**Python:**
```python
registry = panproto.IoRegistry()
print(list(registry.list_protocols()))
```

## Further Reading

- [Tutorial Ch. 8: Lifting Data](https://panproto.dev/tutorial/chapters/08-lifting-data.html)
- [Tutorial Ch. 11: Cross-Protocol Translation](https://panproto.dev/tutorial/chapters/11-cross-protocol-translation.html)
- [Tutorial Ch. 12: Names Across Protocol Boundaries](https://panproto.dev/tutorial/chapters/12-names-across-protocol-boundaries.html)
