---
name: format-preserving
description: >
  Format-preserving parsing via UnifiedCodec and CstComplement. Uses tree-sitter grammars
  for lossless round-trips: emit(parse(bytes)) == bytes for JSON, XML, YAML, TOML, CSV, TSV.
  Covers the tree-sitter feature flag, CST extraction lens, and VCS integration.
---

# Format-Preserving Parsing

panproto 0.24.0 introduces unified tree-sitter-based parsing that preserves all formatting through round-trips. Enable via the `tree-sitter` feature flag on `panproto-io` (or `panproto-core`).

## The problem

Legacy codecs (`JsonCodec`, `XmlCodec`, `TabularCodec`) discard formatting during parsing. A JSON file with custom indentation, key ordering, and trailing newlines becomes canonically reformatted after `parse → emit`.

## The solution

The `UnifiedCodec` uses tree-sitter to parse every format into a lossless CST Schema. Formatting is preserved as schema constraints (interstitials, byte positions, indentation). The CST extraction lens maps from the CST Schema to a domain-level `WInstance`, and the injection direction reconstructs the CST Schema from a modified instance while preserving all formatting.

```
bytes → tree-sitter → CST Schema (lossless) → extraction lens → WInstance
                                                                    ↓
bytes ← emit_from_schema ← CST Schema ← injection lens ← modified WInstance
```

## Supported formats

| Format | Grammar | Round-trip fidelity |
|--------|---------|---------------------|
| JSON | `tree-sitter-json` | Whitespace, key ordering, number representation, trailing newline |
| XML | `tree-sitter-xml` | Attribute ordering, comments, processing instructions, CDATA, self-closing tags |
| YAML | `tree-sitter-yaml` | Indentation, flow vs block style, comment placement |
| TOML | `tree-sitter-toml` | Section ordering, inline tables, comment placement |
| CSV | `tree-sitter-csv` | Line endings, quoting style, header presence |
| TSV | `tree-sitter-tsv` | Line endings, comment lines |

## Usage

### Rust

```rust
use panproto_io::unified_codec::UnifiedCodec;

let codec = UnifiedCodec::json("my_protocol");

// Format-preserving parse: returns both instance and CST complement
let (instance, complement) = codec.parse_wtype_preserving(&schema, &bytes)?;

// Modify the instance via schema lenses...

// Format-preserving emit: uses complement to restore original formatting
let output = codec.emit_wtype_preserving(&schema, &instance, &complement)?;
assert_eq!(bytes, output); // byte-identical if no modifications
```

### TypeScript (via WASM)

```typescript
import { parseInstancePreserving, emitInstancePreserving } from "@panproto/core";

const { instance, complement } = await parseInstancePreserving("openapi", schema, inputBytes);
// ... modify instance ...
const output = await emitInstancePreserving("openapi", schema, instance, complement);
```

### Via the ProtocolRegistry

```rust
// Registry dispatches to UnifiedCodec when tree-sitter feature is enabled
let registry = panproto_io::default_registry();
let (instance, complement) = registry.parse_wtype_preserving("openapi", &schema, &bytes)?;
let output = registry.emit_wtype_preserving("openapi", &schema, &instance, complement.as_ref())?;
```

## CstComplement

The `CstComplement` is the categorical complement of the extraction lens. It stores:

- The full CST Schema (lossless; `emit_from_schema` reconstructs the original bytes)
- A mapping from `WInstance` node IDs to CST vertex names (for updating values during injection)

The CST complement is orthogonal to the semantic `Complement` from schema migrations. They compose as a product: `(CstComplement, Complement)`.

During schema migration, the CST complement passes through unchanged (node IDs are stable for surviving nodes in `wtype_restrict`).

## VCS integration

The VCS stores `CstComplementObject`s alongside data sets via `cst_complement_ids` on `CommitObject`. Functions:

- `store_cst_complement(store, data_id, bytes)`: store during initial ingest
- `pass_through_cst_complement(store, old_id, new_data_id)`: pass through during migration

## Feature flags

| Crate | Feature | What it enables |
|-------|---------|-----------------|
| `panproto-io` | `tree-sitter` | `UnifiedCodec`, CST extraction, format-preserving methods on `ProtocolCodec` |
| `panproto-core` | `tree-sitter` | Passes through to `panproto-io/tree-sitter` |
| `panproto-wasm` | `format-preserving` | WASM exports for format-preserving parse/emit |

## Migration from legacy codecs

The legacy codecs (`JsonCodec`, `XmlCodec`, `TabularCodec`) are deprecated as of 0.24.0. When the `tree-sitter` feature is enabled, all 50+ protocol registrations automatically use `UnifiedCodec`. Without the feature, legacy codecs remain as fallbacks.

To migrate custom code:

```rust
// Before (0.23.x)
use panproto_io::json_codec::JsonCodec;
let codec = JsonCodec::new("my_protocol");
let instance = codec.parse_wtype(&schema, &bytes)?;
let output = codec.emit_wtype(&schema, &instance)?;

// After (0.24.0+, with tree-sitter feature)
use panproto_io::unified_codec::UnifiedCodec;
let codec = UnifiedCodec::json("my_protocol");
let (instance, complement) = codec.parse_wtype_preserving(&schema, &bytes)?;
let output = codec.emit_wtype_preserving(&schema, &instance, &complement)?;
```
