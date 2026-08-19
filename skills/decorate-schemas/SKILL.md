---
name: decorate-schemas
description: >
  Decorate abstract schemas with layout enrichment for source code emission. Covers
  AbstractSchema/DecoratedSchema typed distinction, build_abstract vs build_decorated,
  ParserRegistry::decorate(), LayoutPolicy, the section law, the Grothendieck fibration
  framing (EnrichmentKind::Layout), TheoryTransform::StripEnrichment/AddEnrichment,
  and the cross-crate LayoutEnricher registry.
---

# Decorate Abstract Schemas

You are helping a user attach layout data to a hand-built schema so it can be emitted as source code. This is the put direction of the parse/decorate/emit lens (v0.48.0+).

## When you need this

When you build a schema from `SchemaBuilder` (or receive one from a migration), it has no layout data: no byte spans, no whitespace, no CHOICE discriminators. The emitter cannot render it without these. `decorate` fills the gap.

## Core types

- `AbstractSchema`: a newtype over `Schema` with the invariant `is_layout_free() == true`. No layout-fibre constraints (`start-byte`, `end-byte`, `interstitial-N`, `chose-alt-*`).
- `DecoratedSchema`: a newtype over `Schema` that carries the full layout enrichment from the parser walker. This is what the emitter consumes.
- `LayoutPolicy`: controls formatting (indent width, separator style, line breaks).

## Building abstract schemas

```rust
use panproto_core::schema::{Protocol, SchemaBuilder};

let p: Protocol = panproto_core::protocols::atproto::protocol();
let abstract_schema = SchemaBuilder::new(&p)
    .vertex("$0", "record", None)?
    .vertex("$1", "object", None)?
    .edge("$0", "$1", "record-schema", None)?
    .vertex("$2", "string", None)?
    .edge("$1", "$2", "prop", Some("title"))?
    .constraint("$2", "literal-value", "hello")
    .build_abstract()?;
```

`build_abstract` checks that no layout sort slipped in. If one did, you get `SchemaError::LayoutConstraintsOnAbstractBuild`; use `build_decorated` instead.

## Decorating

```rust
use panproto_core::parse::{LayoutPolicy, ParserRegistry};

let reg = ParserRegistry::new();
let policy = LayoutPolicy::default();
let decorated = reg.decorate("typescript", &abstract_schema, &policy)?;
```

`decorate` renders the abstract schema to canonical bytes under the policy via `pretty_with_protocol`, then re-parses those bytes. The re-parse attaches the complete layout fibre.

## The section law

```
forget_layout(decorate(a, p)) ≅_kind a
```

Equal up to vertex-id renaming and the kind/edge multiset. You can think of `decorate` as a one-sided inverse of `forget_layout`, picking a canonical representative of the parse-preimage at every abstract schema.

## Rendering to bytes

If you just want bytes and do not need the decorated schema:

```rust
let bytes = reg.pretty_with_protocol("typescript", &abstract_schema, &policy)?;
```

## Grothendieck fibration framing

Layout is one of several enrichments a schema can carry over its abstract base. The framing:

- **Base**: `AbstractSchema`
- **Fibre over each vertex**: layout data (byte spans, whitespace, CHOICE discriminators)
- **Total space**: `DecoratedSchema`
- **Projection**: `Schema::forget_layout()` (cartesian projection to base)
- **Section**: `ParserRegistry::decorate()` (picks one layout-data assignment)

At the protolens level:
- `TheoryTransform::StripEnrichment(EnrichmentKind::Layout)` removes the fibre
- `TheoryTransform::AddEnrichment { kind: Layout, enricher, policy }` synthesizes it
- `ComplementConstructor::Enrichment { kind, enricher }` names the synthesis driver in the complement vocabulary

## Cross-crate registration

The `LayoutEnricher` trait in `panproto-lens::enrichment_registry` is the cross-crate bridge. `panproto-parse` populates it at `ParserRegistry::new()` time so the lens crate stays grammar-agnostic.

```rust
pub trait LayoutEnricher: Send + Sync + 'static {
    fn enrich(&self, schema: &Schema, policy: &LayoutPolicySpec) -> Result<Schema, LensError>;
}
```

The registry is a global static keyed by `(EnrichmentKind, enricher_name)`. Functions: `register_enricher()`, `lookup_enricher()`, `has_enricher()`.

## Layout constraint sorts

A vertex carries layout data if it has constraints with these sort names (the predicate is `panproto_gat::is_layout_sort`):
- `start-byte`, `end-byte`: byte position in the source
- `interstitial-N`: whitespace/punctuation between adjacent named children
- `ptrace-N`: anonymous grammar tokens in source order (the variant tag for CHOICE dispatch)
- `chose-alt-fingerprint`: which CHOICE alternative the parser took
- `chose-alt-child-kinds`: discriminator for ambiguous alternatives
- `doc-prefix`: a leading byte run (BOM, line-continuation) before the root
- `blank-lines-before`: blank-line count before a vertex (a layout sort as of 0.52.1, so `forget_layout` strips it)

`Schema::is_layout_free()` returns true when none of these are present, and `forget_layout` strips exactly this set. Sorts NOT in this set (e.g. `literal-value`, `pre-alias-symbol`, `field:<name>`) survive `forget_layout` and are what the abstract / by-construction emit path reconstructs from.

## Layout calculus vocabulary (0.52.0)

`panproto-gat` exposes the theory-level vocabulary the emitter targets, re-exported at the crate root:

- `LayoutRole`: the structural role of a token: `BracketOpen`, `BracketClose`, `Separator`, `Keyword`, `Operator`, `Connector`, `Terminal`, plus `Immediate` for `IMMEDIATE_TOKEN` tokens. A role is a fact about the grammar (a `(` the grammar marks as a matched-pair open is `BracketOpen` whatever its character), assigned once during derivation.
- `Adjacency` (`Tight` / `Space` / `Break`): the pure relation over role pairs. `Adjacency::between(prev, next)` decides spacing from roles alone, with no token-text inspection. It is the role-pair table the 0.51.0 emit rewrite replaced ad-hoc character checks with.
- `LayoutSpec` / `RuleLayout`: the grammar-derived payload of the `Layout` enrichment in its derived form (per-rule role assignment, indent markers, separator policy plus the `LayoutPolicy` knobs). The emitter is a model-interpreter over this spec rather than re-deriving roles per call.
