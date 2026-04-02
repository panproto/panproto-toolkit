---
name: convert-data
description: >
  Convert data between formats using panproto. Covers the parse/schema/migrate/emit
  pipeline, cross-protocol translation, and batch data operations.
argument-hint: "<from-protocol> <to-protocol>"
---

# Converting Data

You are helping a user convert data between formats. panproto supports 50 protocols and 50+ I/O codecs. The conversion pipeline is: parse, represent as schema graph, migrate, emit.

## Step 1: Identify source and target

Ask the user for:
1. Source format/protocol (e.g., `json-schema`, `avro`, `protobuf`)
2. Target format/protocol (e.g., `openapi`, `sql`, `graphql`)
3. The data to convert (file path or inline)

To see all available protocols:
```bash
schema validate --list-protocols
```

## Step 2: Single record conversion

### CLI
```bash
# Convert a single record
schema data convert \
  --from json-schema \
  --to openapi \
  --protocol atproto \
  record.json

# Or let panproto auto-discover the protocol
schema data convert \
  --from json-schema \
  --to openapi \
  record.json
```

### TypeScript
```typescript
const p = await Panproto.init();

// Define source and target schemas
const srcProto = p.protocol('json-schema');
const tgtProto = p.protocol('openapi');

// Parse source data
const srcInstance = p.parseInstance(srcProto, sourceData);

// Convert
const converted = p.convert(srcInstance, srcSchema, tgtSchema);

// Emit in target format
const output = p.emitInstance(tgtProto, converted);
```

### Python
```python
import panproto

src_proto = panproto.get_builtin_protocol("json-schema")
tgt_proto = panproto.get_builtin_protocol("openapi")

# Parse, convert, emit
src_instance = panproto.parse_instance(src_proto, source_data)
converted = panproto.convert(src_instance, src_schema, tgt_schema)
output = panproto.emit_instance(tgt_proto, converted)
```

### Rust
```rust
use panproto_core::*;

let src_proto = panproto_protocols::data_schema::cddl::protocol();
let tgt_proto = panproto_protocols::api::openapi::protocol();

let registry = panproto_io::default_registry();
let src_instance = registry.parse_wtype("cddl", &src_schema, &source_data)?;
let config = panproto_lens::AutoLensConfig::default();
let result = panproto_lens::auto_generate(&src_schema, &tgt_schema, &src_proto, &config)?;
let (view, _complement) = panproto_lens::get(&result.lens, &src_instance)?;
let output = registry.emit_wtype("openapi", &tgt_schema, &view)?;
```

## Step 3: Batch conversion

### Directory of files
```bash
schema data migrate records/ \
  --src-schema old-schema.json \
  --tgt-schema new-schema.json \
  --output converted/
```

### With VCS integration
If you are using panproto's schema version control:
```bash
# Migrate all data files through schema history
schema data migrate records/
# panproto finds the right schema version for each record
# and chains lenses through the commit history
```

## Step 4: Cross-protocol translation

Converting between different protocols (e.g., Protobuf to GraphQL):

```bash
schema data convert \
  --from protobuf \
  --to graphql \
  --protocol protobuf \
  message.bin
```

Cross-protocol translation may involve:
- **Construct mapping**: some source constructs may not exist in the target (e.g., Protobuf `oneof` has no direct GraphQL equivalent)
- **Name resolution**: naming conventions differ across protocols
- **Type coercion**: type systems may not align exactly

The conversion report tells you what was preserved, approximated, or lost.

## Step 5: Schema conversion

Convert the schema itself (not the data) between formats:

```bash
# Convert a JSON Schema to OpenAPI
schema data convert \
  --from json-schema \
  --to openapi \
  source-schema.json
```

This translates the schema graph from one protocol's vertex/edge kinds to another's, using the best available mapping.

## Step 6: Inspect I/O codecs

To see all available codecs for a protocol:

**TypeScript:**
```typescript
const io = p.ioRegistry();
console.log(io.listProtocols());
// ['atproto', 'openapi', 'avro', 'protobuf', 'sql', 'graphql', ...]
```

**Python:**
```python
registry = panproto.IoRegistry()
print(registry.list_protocols())
```

## Further Reading

- [Tutorial Ch. 8: Lifting Data](https://panproto.dev/tutorial/chapters/08-lifting-data.html)
- [Tutorial Ch. 11: Cross-Protocol Translation](https://panproto.dev/tutorial/chapters/11-cross-protocol-translation.html)
- [Tutorial Ch. 12: Names Across Protocol Boundaries](https://panproto.dev/tutorial/chapters/12-names-across-protocol-boundaries.html)
