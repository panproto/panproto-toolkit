---
name: sdk-swift
description: >
  Complete guide for using panproto from Swift via the SwiftPM package at bindings/swift.
  Covers installation against the published XCFramework or a local dev-link build, the six
  products and three package traits, the PanprotoEngine actor and handle lifetime, the
  PanprotoStructural value layer, the span search, migrations, lenses, VCS, the PanprotoError
  taxonomy, and what the C ABI does not let the binding reach.
user-invocable: true
---

# Swift SDK Guide (bindings/swift)

You are helping a user work with panproto from Swift. The binding is a
[SwiftPM](https://www.swift.org/documentation/package-manager/) package at
[`bindings/swift/`](https://github.com/panproto/panproto/tree/main/bindings/swift), linking
`libpanproto_c`, the C ABI exposed by the
[`panproto-c`](https://github.com/panproto/panproto/tree/main/crates/panproto-c) crate. It
reaches all 122 entry points: protocols, schemas, instances, I/O codecs, compatibility
checking, migrations, lenses, the GAT layer, the expression language, span and morphism
search, graph fibers, enrichment, datasets, version control, and the gated parse, project,
and git tiers.

The C ABI is the ceiling. Swift and Haskell reach it exactly and are at parity with each
other. Python exceeds both, because `panproto-py` is a PyO3 extension linking `panproto-core`
directly. "Parity with Python" means extending the ABI, not this binding.

Every symbol, signature, and argument label below was read out of `bindings/swift` at v0.71.0,
and the examples were type-checked against the built modules rather than eyeballed. Swift makes
argument labels part of the name, so a label carried over from another SDK does not compile;
check the source before changing one.

## Installation

The manifest declares `swift-tools-version: 6.1`, so 6.1 is the floor a toolchain has to clear,
whatever a prose page says. The package builds in Swift 6 language mode with strict concurrency
and platforms are `.macOS(.v14)` and `.iOS(.v17)`.

It is not on a registry. `Package.swift` resolves `libpanproto_c` in one of three modes, in
this order of precedence:

| Mode | Selected by | Reaches iOS |
| --- | --- | --- |
| explicit XCFramework | `PANPROTO_SWIFT_XCFRAMEWORK`, or `PANPROTO_SWIFT_XCFRAMEWORK_URL` with `PANPROTO_SWIFT_XCFRAMEWORK_CHECKSUM` | yes |
| dev-link | a staged library under `.panproto-c/lib`, or `PANPROTO_C_LIB_DIR` | no |
| release pin | the URL and SHA-256 constants at the top of `Package.swift` | yes |

**Depending on it from another project** means the XCFramework path. Point the two URL
variables at a published artifact and its checksum, both of which the release attaches. That
mode adds no linker flags of its own, which is the whole reason it exists: SwiftPM rejects any
package whose manifest carries `unsafeFlags`, and dev-link mode passes an unsafe `-L` plus an
rpath. `Package.swift` emits those flags only when a staged directory actually exists on disk,
so a consumer resolving the package never sees them.

The release pin is the no-configuration path for a tagged checkout. `publish-swift.yml`
rewrites both constants when it publishes an artifact, so read the pin rather than assuming it
matches the workspace: at v0.71.0 it names the **v0.70.1** XCFramework, because it tracks the
last published Swift artifact and lags whenever a release ships without one.

**A caveat that affects a tagged checkout, not a dependency.** SwiftPM resolves the mirror,
never the monorepo: `panproto/panproto` has no `Package.swift` at its root, and SwiftPM has no
subpath option. The mirror is published by the same workflow that rewrites the pin, and its
`mirror` job runs `needs: pin`, so a mirrored tag carries the corrected pin. `panproto-swift`
at `v0.71.0` pins the v0.71.0 XCFramework and builds.

The monorepo tag is the one place the two disagree. `publish-swift.yml` commits the rewritten
pin to `main` after the tag build attaches the artifact, so the tag itself keeps the previous
release's pin. At v0.71.0 that pin is v0.70.1, whose header predates `pp_hom_find_span` and
`pp_hom_span_to_overlap`, which `Sources/PanprotoFFI/Raw+Transform.swift` calls behind no `#if`.
So `git checkout v0.71.0 && cd bindings/swift && swift build` with no staged library fails with
`error: cannot find 'pp_hom_find_span' in scope`, because with nothing staged the manifest falls
back to the pin and resolves `CPanproto` as a `binaryTarget`, whose own header is then the only
one in the build.

Run `bootstrap/dev-link.sh` first and the question does not arise: a staged library takes
precedence over the pin, and the vendored header is the one that matters. That is what the
install instructions tell you to do, and it is the path CI uses.

**Building from source** needs a Rust toolchain:

```sh
cd panproto/bindings/swift
./bootstrap/dev-link.sh     # cargo build -p panproto-c --release, then stage
swift build && swift test
```

`dev-link.sh` stages the dylib and static archive into `.panproto-c/lib` and syncs the vendored
`Sources/CPanproto/include/panproto.h` the package compiles against, saying so when the header
moved, because a changed header is a changed ABI. Re-run it after every change to `panproto-c`
or the workspace `Cargo.toml`.

**Prebuilt** binaries need neither Rust nor a workspace checkout.
`bootstrap/fetch-bindist.sh [version] [variant] [--xcframework]` reads its two positionals by
shape rather than by position, so the variant can be chosen without naming a version:

```sh
./bootstrap/fetch-bindist.sh            # host library, default surface
./bootstrap/fetch-bindist.sh full       # host library, all features
./bootstrap/fetch-bindist.sh --xcframework
PANPROTO_SWIFT_XCFRAMEWORK=.panproto-c/panproto_c.xcframework swift build
```

`binaryTarget(path:)` rejects an absolute path, so `Package.swift` relativizes whatever
`PANPROTO_SWIFT_XCFRAMEWORK` names; pasting the absolute path the script prints works.
`PANPROTO_SWIFT_DOCC=1` opts into the DocC plugin, the package's only external dependency, kept
off by default so `swift build` on a fresh checkout never reaches the network.

## Products and package traits

| Product | Contents | Engine | Trait |
| --- | --- | --- | --- |
| `PanprotoStructural` | schemas, instances, migrations, chains, diffs as values, plus the CBOR codec | no | |
| `Panproto` | protocols, schemas, instances, I/O, checking, migration, lenses, expressions, theories, enrichment, hom search, graph fibers, datasets | yes | |
| `PanprotoVcs` | schematic version control | yes | |
| `PanprotoParse` | full-AST source parsing | yes | `PANPROTO_PARSE` |
| `PanprotoProject` | multi-file project assembly | yes | `PANPROTO_PROJECT` |
| `PanprotoGit` | the git bridge | yes | `PANPROTO_GIT` |

`PanprotoStructural` names no dependency at all in `Package.swift`, so a pipeline that only
reads and rewrites schemas links it alone and never starts an engine. `PanprotoFFI` is the raw
shim layer, one `Raw.*` function per ABI entry point; you can reach it, but domain code should
not, since those return status codes and byte buffers with no error draining and no handle
ownership.

The default `libpanproto_c` exports **105** of the 122 entry points. The other 17 (ten
`pp_parse_*`, six `pp_project_*`, one `pp_git_import`) exist only in a build carrying the
matching cargo features, so reaching them takes both:

```sh
PANPROTO_C_FEATURES=full ./bootstrap/dev-link.sh
swift build --traits PANPROTO_PARSE,PANPROTO_PROJECT,PANPROTO_GIT
```

A trait defines a compilation condition of its own name, which is what the `#if PANPROTO_PARSE`
blocks in the gated sources read; `dev-link.sh` prints the exact invocation for the features it
just built. The three gated products always exist in the package graph, so resolution never
depends on how the library was built, and without its trait a module compiles to nothing. That
is not decoration: referencing the absent 17 symbols unconditionally would make every default
build fail to link.

## The engine and handle lifetime

This is the part a Swift developer most needs, and no other SDK has an analogue for it.

`PanprotoEngine` is a `@globalActor public actor` whose executor is a `SerialExecutor` running
every job on one dedicated `Thread` for the lifetime of the process. Everything touching a
handle is isolated to it, so every call is `await`.

The reason is narrower than it looks, and it decides what you can do. The slab handing out
handles is process-global and mutex-guarded, so a handle really is valid from any thread. What
is thread-local is the *last-error slot*: a failing entry point stashes its `ErrorEnvelope`
where only the calling thread can drain it, and `pp_last_error_take` on any other thread answers
empty. Every error message the binding reports depends on the drain landing on the thread that
failed. A serial `DispatchQueue` gives mutual exclusion but not thread identity, so the
invariant would hold only as long as no call ever suspended between the failure and the drain.
Pinning makes it hold unconditionally, at the cost of one resident thread.

Each call from nonisolated code is one hop out and one back. Where you have a run of engine
work, isolate a region of your own code and pay one:

```swift
@PanprotoEngine
func vertexCounts(of lexicons: [Data]) throws(PanprotoError) -> [Int] {
    var counts: [Int] = []
    for lexicon in lexicons {
        let parsed = try SchemaHandle.parseAtprotoLexicon(lexicon)
        defer { parsed.release() }
        counts.append(try parsed.schema().vertexCount)
    }
    return counts
}

let counts = try await PanprotoEngine.run { try vertexCounts(of: lexicons) }
```

`PanprotoEngine.run(_:)` is isolated to the global actor rather than to the actor instance,
which is what lets it call a `@PanprotoEngine`-isolated closure synchronously. Engine methods
are synchronous CPU-bound work performed off the caller's executor, and the C ABI has no
cancellation channel, so task cancellation is observed *between* calls and never inside one.

### Handles

`PanprotoHandle` is an `open class` holding one `UInt32` slab index; the fourteen slab variants
are its `final` subclasses, adding no stored state, so the variant is a compile-time fact and a
`SchemaHandle` cannot be passed where the ABI wants a `ProtocolHandle`.

| Swift type | Slab variant | Tier |
| --- | --- | --- |
| `ProtocolHandle` | `Protocol` | core |
| `SchemaHandle` | `Schema` | core |
| `MigrationHandle` | `Migration` | core |
| `CompiledMigrationHandle` | `MigrationWithSchemas` | core |
| `IoRegistryHandle` | `IoRegistry` | core |
| `TheoryHandle` | `Theory` | core |
| `ModelHandle` | `Model` | core |
| `ProtolensChainHandle` | `ProtolensChain` | core |
| `SymmetricLensHandle` | `SymmetricLens` | core |
| `DataSetHandle` | `DataSet` | core |
| `RepositoryHandle` | `VcsRepo` | vcs |
| `AstRegistryHandle` | `AstRegistry` | parse |
| `ProjectBuilderHandle` | `ProjectBuilder` | project |
| `ProjectSchemaHandle` | `ProjectSchema` | project |

Three things follow.

**Nothing has to be released by hand for the program to be correct.** A deinitializer cannot
suspend, so it cannot hop onto the actor; it appends the raw index to the executor's release
queue, and the engine thread frees it on its next pass, ahead of new work. `release()` is about
*when*, not whether. It is idempotent and safe to interleave with deinitialization.

**`defer { handle.release() }` compiles only inside an isolated scope**, because `release()` is
engine-isolated and a `defer` body cannot suspend. Written in a nonisolated `async` function it
is a compile error, not a runtime surprise:

```text
error: call to global actor 'PanprotoEngine'-isolated instance method 'release()'
       in a synchronous nonisolated context [#ActorIsolatedCall]
note: add '@PanprotoEngine' to make global function '...' part of global actor 'PanprotoEngine'
```

Take the note's advice, or write `await handle.release()` at the point you mean it, or let the
deinitializer do it. This is the most common thing a host gets wrong when porting the Rust or
Python examples, both of which release inside a scope exit.

**The case that genuinely needs an explicit release is a loop**, which would otherwise hold
every intermediate until the loop ends.

Handle equality is `rawValue` together with the Swift type, over *live* handles: the slab reuses
an index once freed, so a released handle and one allocated afterwards can name the same index
while standing for different resources, and equality cannot see it. `ModelHandle` is the one
resource that cannot leave the engine as data, because a model interprets each operation as a
Rust closure.

## The value layer

`PanprotoStructural` carries the wire types offline. `Schema` holds vertices, edges,
hyper-edges, constraints, required edges, nsids, entries, variants, orderings, recursion points,
spans, usage modes, the nominal flag, and the four enrichment maps (`coercions`, `mergers`,
`defaults`, `policies`). `Instance`, `Complement`, `Migration`, `SchemaDiff`, `ProtolensChain`,
`Theory`, `Expr`, and the VCS records are all here, every one `Sendable`, `Hashable`, `Codable`.

**The `Codable` conformances are the CBOR shapes.** Every payload crossing the ABI is CBOR from
[`ciborium`](https://docs.rs/ciborium) driven by [`serde`](https://serde.rs/), and `CBOREncoder`
/ `CBORDecoder` conform to Swift's `Encoder` and `Decoder`. Each wire type's `CodingKeys` are
the Rust field names in Rust declaration order, so a host encoding a payload itself is a
consumer of that key set: write `quality_lo`, not `qualityLo`. Where a Rust map is keyed by a
struct, which CBOR cannot use as a map key, the type crosses as an array of two-element arrays
and Swift sorts it by key on the way out; `FoundMorphism.edgeMap` and `SchemaMorphism.edgeMap`
both do this.

Encoding is deterministic (definite lengths, shortest integer head, narrowest exact float width,
canonical key ordering). The engine's output is not, and conformance is not defined in terms of
it: most schema and instance fields are Rust `HashMap`s and `ciborium` writes a map in iteration
order, so two runs can emit one schema as different bytes. Conformance means *the decoded value
is equal*. Bytes the engine rejects are the failure this layer catches; bytes differing from a
previous run are not a failure at all. Decoding is tolerant in the ways a forward-compatible
host needs: indefinite lengths, unknown keys, semantic tags, and every float width all decode.

The Rust `Schema` stores three precomputed adjacency indices and the Swift value does not: they
are derivable from the edge set, so the encoder recomputes them on the way out and the decoder
ignores them on the way in, with `outgoingEdges(from:)`, `incomingEdges(to:)`, and
`edges(between:and:)` as pure accessors.

```swift
var schema = try CBORDecoder().decode(Schema.self, from: payload)
schema.entries = ["app.bsky.feed.post"]
let outgoing = schema.outgoingEdges(from: "app.bsky.feed.post")
let bytes = try CBOREncoder().encode(schema)
```

`CBORValue` is the untyped escape hatch, itself `Codable`, so a field typed `CBORValue` passes a
fragment the Swift model does not describe through unchanged; `LensCandidate.chain` is exactly
that.

Standard conformances are given where the structure already is the algebra and withheld where it
is not. `ProtolensChain` is a monoid under step concatenation, `+` with a genuine two-sided
`.empty`. `OpticKind` is a monoid under the optics lattice, `iso` the unit and `traversal`
absorbing. `Migration` composes but gets no monoid-shaped protocol: engine composition is
drop-on-miss, the only identity is the per-schema self-map `Migration.identity(on:)`, and calling
that a monoid would be a lie the type system would then let you rely on.

## Building a schema

The engine has no builder resource. `pp_schema_build` takes the whole step list and replays it
against the protocol, so `SchemaBuilder` is a value and building is one crossing, not one per
step.

```swift
let atproto = try await ProtocolHandle.builtin("atproto")

var builder = atproto.schemaBuilder()
builder.vertex("app.bsky.feed.post", kind: "record", nsid: "app.bsky.feed.post")
builder.vertex("app.bsky.feed.post:body", kind: "object")
builder.vertex("app.bsky.feed.post:body:text", kind: "string")
builder.edge(from: "app.bsky.feed.post", to: "app.bsky.feed.post:body", kind: "record-schema")
builder.edge(
    from: "app.bsky.feed.post:body", to: "app.bsky.feed.post:body:text",
    kind: "prop", name: "text"
)
builder.constraint("maxLength", value: "3000", on: "app.bsky.feed.post:body:text")
builder.entry("app.bsky.feed.post")
let schema = try await builder.build()
```

`ProtocolHandle.buildSchema` is the declarative spelling of the same step list, followed by
`build()`:

```swift
let schema = try await atproto.buildSchema {
    Vertex(id: "app.bsky.feed.post", kind: "record", nsid: "app.bsky.feed.post")
    Vertex(id: "app.bsky.feed.post:body", kind: "object")
    Vertex(id: "app.bsky.feed.post:body:text", kind: "string")
    Edge(src: "app.bsky.feed.post", tgt: "app.bsky.feed.post:body", kind: "record-schema")
    Edge(
        src: "app.bsky.feed.post:body", tgt: "app.bsky.feed.post:body:text",
        kind: "prop", name: "text"
    )
    VertexConstraint(sort: "maxLength", value: "3000", on: "app.bsky.feed.post:body:text")
    Entry("app.bsky.feed.post")
}
```

`Vertex`, `Edge`, and `HyperEdge` are the `PanprotoStructural` value types themselves;
`VertexConstraint`, `RequiredEdges`, and `Entry` pair a value with the vertex it is declared
against, which is what the builder signatures take and what the value types do not carry.
Conforming your own type to `SchemaStatement` is supported.

Two things trip people. Order matters the way it matters to the engine: an edge names vertices
earlier steps added. And entries cost a second crossing, because the engine's build-op list has
no step for them, so a builder carrying entries reads the built schema back, sets `entries`, and
hands it over again, releasing the intermediate handle.

Other ways in: `SchemaHandle.define(_:)` hands over a `Schema` value,
`SchemaHandle.parseAtprotoLexicon(_:)` reads a published Lexicon as raw JSON (a `$ref` into
another document becomes a placeholder vertex of kind `ref`), and `normalized()` collapses
reference chains into a fresh handle. `violations(against:)` validates: an empty array means
valid, a non-empty one is the messages, and a *thrown* error means validation could not run.

## The span search

v0.71.0's headline, and the entry point to reach for.

```swift
let span = try await post.findSpan(to: profile, in: atproto)

span.apex                // Schema: the sub-schema of the source that found a target
span.left                // Migration: apex → src, an inclusion
span.right               // Migration: apex → tgt, the assignment restricted to the apex
span.quality
span.qualityLo
span.qualityHi
span.apexCoverage
span.provenOptimal
span.isTotal
span.apexDigest          // lower-case hex
span.legsAreFunctorial
```

Those eleven fields are the whole of `SchemaSpan`, flat rather than nested. The wire keys are
`apex`, `left`, `right`, `quality`, `quality_lo`, `quality_hi`, `apex_coverage`,
`proven_optimal`, `is_total`, `apex_digest`, `legs_are_functorial`.

`findSpan` never refuses for want of a match, since leaving every source vertex out of the apex
is a feasible answer, so two schemas with nothing in common answer with an empty apex rather than
throwing. That is why it is the method to reach for when `findBestMorphism` answers `nil`, which
for schemas not built from each other is the ordinary case.

`protocolHandle` is a parameter because the apex is a schema, a schema is well formed only
against a protocol, and inducing the apex re-validates it; a schema stores only its protocol's
name, so the protocol cannot be read off the source handle.

`apexDigest` and `legsAreFunctorial` are what identifying a span takes. The digest with the two
leg maps is the span's identity, there is no schema-digest entry point on the ABI, and the CBOR
a host holds is not the digest's pre-image, so a Swift host that wants to dedupe or cache a span
reads it here or not at all. Both carry initializer defaults, because the engine decodes them
with `serde(default)`: a host encoding a span for `overlap()` without them still produces a
payload the engine reads.

`qualityLo` and `qualityHi` are equal exactly when `provenOptimal` holds; a wider interval
separates "nothing better exists" from "the search ran out of budget". And `quality` ranks spans
over **one** source schema and nothing else, because every denominator of the objective is fixed
by the source, so read `apexCoverage` alongside it. An empty apex charges the full penalty on
each component the source gives mass to, so its score moves with the source's shape rather than
sitting at zero.

```swift
let overlap = try await span.overlap()
overlap.vertexPairs      // [WirePair<Name, Name>]
overlap.edgePairs        // [WirePair<Edge, Edge>]
```

Each pair is `(source element, target element)`, taken from the right leg alone because the left
leg is an inclusion and the apex's identifiers *are* source identifiers. Both arrays are sorted
by key, so one span always yields the same list. `asTotalMorphism` is a computed property on the
value and needs no engine; `overlap()` does.

### Steering it

```swift
let span = try await post.findSpan(
    to: profile,
    in: atproto,
    options: MorphismSearchOptions(
        monic: true,
        hardPins: ["app.bsky.feed.post": "app.bsky.actor.profile"]
    ),
    constraints: MorphismDomainConstraints(
        restrictedDomains: ["app.bsky.feed.post:body": ["app.bsky.actor.profile:body"]],
        excludedTargets: ["app.bsky.actor.profile:body:avatar"],
        scoringWeights: MorphismCostWeights(
            name: 0.4, edge: 0.3, prop: 0.2, degree: 0.1, anchor: 0.0)
    )
)
```

`MorphismSearchOptions` fixes the shape asked for: `monic`, `epic`, `iso`, `maxResults`,
`hardPins`, all defaulted, so an empty payload is valid. `hardPins` is a hard restriction the
search may not reconsider, not a starting point; a pin the target's kind cannot accept leaves its
source vertex out of the apex rather than failing the search, and anything *inferred* does not
belong there. `epic` is honored by the two morphism entry points and refused by `findSpan`, which
reports `PanprotoError.migration` carrying the engine's `EpicIsNotASpanProperty`: surjectivity is
a property of a total morphism and a span's right leg is deliberately partial.

`MorphismDomainConstraints` is a separate payload only `findSpan` takes, and every field is a hard
restriction. Restricting a vertex to the empty list, or naming it in `excludedSources`, leaves it
out of the apex, so asking a *total* morphism search to omit part of its domain has no answer.
`MorphismCostWeights` carries five components the engine normalises to sum to one, so only the
ratios matter, and refuses a vector that is negative, non-finite, or all zero.

The node budget is deliberately absent from `MorphismSearchOptions`: it lives on the engine's
search budget, which the span search takes and the total-morphism entry points do not, and the
ABI does not expose it.

### Total morphisms are the degenerate case

```swift
let candidates = try await post.findMorphisms(
    to: profile, options: MorphismSearchOptions(monic: true, maxResults: 8))

guard let best = try await post.findBestMorphism(to: profile) else {
    return    // No total morphism exists. Ask for a span.
}
let migration = try await best.migration()   // MigrationHandle
let spec = best.asMigration                  // Migration, value-level, no engine
```

`findMorphisms` returns the morphisms **attaining the optimum** and nothing else, so every element
carries the same `quality`, the first is what `findBestMorphism` answers with, and there is no
second, worse tier to walk to. An empty array means no total morphism exists, and only that: a
search that could not be posed throws `PanprotoError.migration` instead.

The engine caps every request at 1024 optima, whether or not `maxResults` is zero, and **Swift
has no flag saying the cap bound**: the Rust `MorphismList.truncated` does not cross the ABI,
since `pp_hom_find_morphisms` encodes a bare `Vec<FoundMorphismWire>`.

`FoundMorphism.migration()` answers a bare `MigrationHandle`, carrying no anchoring schemas.
Operations wanting the source and target alongside the migration, `put` among them, need a
`CompiledMigrationHandle`, which comes from `Migration.compile(from:to:)`, from
`ProtolensChainHandle.instantiate(at:)`, or from `SchemaHandle.induceMigration(along:to:)`. That
last one is the theory cascade: it pushes a `TheoryMorphism` down onto the schema and answers
with both halves, the compiled handle and the `SchemaMorphism` accounting for what moved.

## Migrations

A migration crosses the boundary in two shapes: a `Migration` value going in, a slab handle
holding the compiled form coming back.

```swift
let mapping = Migration {
    VertexMapping(from: "app.bsky.feed.post", to: "app.bsky.feed.post")
    EdgeMapping(
        from: Edge(src: "post", tgt: "post:body", kind: "record-schema"),
        to: Edge(src: "note", tgt: "note:body", kind: "record-schema")
    )
    EdgeResolution(
        from: "note", to: "note:text",
        with: Edge(src: "note", tgt: "note:text", kind: "prop", name: "text")
    )
}

let report = try await mapping.checkExistence(against: atproto, from: source, to: target)
guard report.valid else { return print(report.errors) }

let compiled = try await mapping.compile(from: source, to: target)
let lifted = try await compiled.lift(record)

let coverage = try await compiled.coverage(over: records, from: source, to: target)
coverage.total; coverage.succeeded; coverage.failed; coverage.coveragePercent
coverage.errors                              // the first twenty failures, each naming a position
coverage.srcVertices; coverage.tgtVertices   // read a low share against how much was in play
```

`EdgeResolution` and the builder's `resolve(from:to:with:)` are the ones people forget. Dropping
an intermediate vertex leaves a parent and child adjacent that were not before, and where the
target schema holds several edges joining them the lift fails without an entry saying which one
the pair resolves to. `MigrationBuilder` is the imperative spelling of the same three statements:
`mapVertex(_:to:)`, `mapEdge(_:to:)`, `resolve(from:to:with:)`, then `build()`.

`checkExistence` answers a verdict rather than throwing; a thrown error means the check could not
run. Which obligations apply comes from the protocol handle, so a mapping between schemas of a
small protocol answers to fewer of them. `coverage` is the dry run: what share of a data set the
migration carries, before anything is committed to it.

**Two handle variants, one protocol.** `MigrationCarrying` is what the five shared operations are
written against, and both `CompiledMigrationHandle` and `MigrationHandle` conform. The difference
is anchoring. The first keeps the source and target schemas it was compiled against. The second
keeps the compiled payload alone, and the engine reconstructs a minimal schema from its surviving
vertex and edge sets whenever an operation needs one; those vertices come back with kind
`unknown` and no nsid, which is enough to lift a record through and **not** enough to validate one
against. A bare `MigrationHandle` declares no protocol name and no primary entry either, so
`lift(json:rootVertex:)` through one needs the root vertex named.

`composed(with:)` on either answers a bare `MigrationHandle`. Composition is drop-on-miss and it
is *structural*: field transforms, conditional survival, term assignments, and expansion paths are
not composed and do not appear in the result.

**The value-level algebra** needs no engine. Note that `identity(on:)` takes a `Schema` *value*,
not a `SchemaHandle`, so read the handle out with `schema()` first:

```swift
let identity = Migration.identity(on: schema)          // schema: Schema, not SchemaHandle
let rename = Migration.renamingField(on: "post", field: "post:text", from: "text", to: "body")
let chained = Migration.pipeline([identity, rename])   // same as identity + rename
```

`addingField(to:named:kind:)`, `removingField(_:)`, `renamingField(on:field:from:to:)`, and
`hoistingField(on:through:to:)` write the four common edits. `removingField` answers the *empty*
mapping, because removal at this layer is stated by omission and only removes anything in
composition against a mapping carrying the vertices meant to survive; do not expect it to do
anything alone. `+` is a semigroup operation, not a monoid one. `Migration.inverted(from:to:)`
needs a bijection, so a mapping merging two vertices has no inverse and throws, and the inverse
comes back without expression resolvers.

## Lenses

A lens in this binding *is* a `CompiledMigrationHandle`; the lens surface hangs off that type.

```swift
let chain = try await ProtolensChainHandle.autoGenerate(
    from: source, to: target, stringency: .balanced)
let spec = try await chain.complementSpec(at: source)   // what the complement will carry
let lens = try await chain.fuse().instantiate(at: source)

let projection = try await lens.get(record)
projection.view          // Instance of the target schema
projection.complement    // Complement: everything the target had no room for

let restored = try await lens.put(view: edited, complement: projection.complement)
let laws = try await lens.checkLaws(record)             // laws.holds, laws.violation
```

These are Cambria-style asymmetric delta lenses with a complement, verified at runtime through
the engine rather than van Laarhoven optics. Hold on to the complement: a view without it pushes
back nothing, and the engine checks the source-schema fingerprint it carries and refuses a
mismatch. `checkGetPut` and `checkPutGet` check the halves separately, and `GetPut` is the one a
deliberately lossy projection is still expected to satisfy. `fuse()` composes the steps
symbolically into one step doing what the whole chain did, with one complement; reach for it
before instantiating a chain that will run over many records.

**Two methods on `CompiledMigrationHandle` compose, and they are not the same composition.**
`composedLens(with:)` is the lens one: it keeps both directions and both complements, so a `put`
through the composite undoes both projections, and it answers a `CompiledMigrationHandle`.
`composed(with:)` is the migration one inherited from `MigrationCarrying`: structural only, and
it answers a bare `MigrationHandle`. Reaching for the shorter name because it is shorter loses
the backward direction silently.

`LensStringency` is `.strict`, `.balanced` (the default), `.lenient`, `.exploratory`, ordered by
how much they admit, `Comparable`, with `joined(with:)` taking the looser of two and
`.identity` spelled `.strict`. Only `.exploratory` reports carrier bridges, and they arrive as
`AutoLensCandidates.coerceProposals` beside the list rather than on any one candidate, because
they are a property of the run.

```swift
let ranked = try await ProtolensChainHandle.autoGenerateCandidates(
    from: source, to: target, limit: 5, stringency: .exploratory)
ranked.candidates[0].score      // also .quality, .coverage, .strategiesUsed, .steps
let chosen = try await ProtolensChainHandle.from(candidate: ranked.candidates[0])
```

`from(candidate:)` is what makes a candidate other than the top one usable, since each
candidate's `chain` is a `CBORValue` description rather than a handle. `stepSummaries()` is lossy
on purpose: it names each step and its two endofunctors and says whether the step keeps
everything, dropping the transforms and complement constructor that make it runnable. Show it to
a person. Do **not** feed it to `fromJSON(_:)`, which reads whole steps and fails on a summary.

Other chain sources are `fromDiff(_:from:to:)`, `fromJSON(_:)`, and three `compileDocument`
overloads for a lens DSL document. **`fromDiff` takes a `DiffSpec`, which is not what
`diff(to:)` returns**; see the three diff shapes below. `LensDocumentFormat` is `json` and
`yaml` only. Nickel is
deliberately absent, because evaluating it needs a filesystem for its contract imports which the
engine boundary does not have, so author in Nickel and evaluate to JSON first.

Symmetric lenses have no privileged side:

```swift
let symmetric = try await SymmetricLensHandle.fromSchemas(left, right)
let synced = try await symmetric.sync(view: changed, complement: middle, direction: .leftToRight)
```

The complement `sync` wants is captured against the *middle* schema the span was discovered at,
not against either replica; a complement from a replica-side `get` names a different source and is
refused.

## Version control

```swift
try await withRepository(at: directory) { repository in
    let staged = try repository.add(schema)
    staged.schemaId; staged.autoDerived; staged.valid; staged.validationMessages

    let head = try repository.commit(message: "initial schema", author: "alice")

    _ = try repository.createBranch(named: "feature")
    _ = try repository.checkout("feature")
    _ = try repository.checkout("main")

    let merged = try repository.merge(branch: "feature", author: "alice")
    merged.fastForward; merged.mergeCommit; merged.conflicts

    for entry in try repository.log(limit: 20).entries {
        print(entry.commitId, entry.message, entry.schemaId)
    }
}
```

`withRepository(at:_:)` opens the store, runs the body on the engine, and releases the handle.
The body is already isolated, so nothing inside it is `await`, and the `throws` clause is untyped
so the body may fail its own way. `RepositoryHandle.open(at:)` writes a store where the directory
holds none, setting HEAD to an unborn `main`, so a first run and every later one call the same
thing.

`add` reports `autoDerived` when a migration from HEAD's schema was derived alongside it. Staging
does not reject an invalid schema; `commit` is what refuses to record one. `VcsStatus.headCommit`
is nil exactly when HEAD is unborn, and `workingDirty` tracks `hasStaged`, because the working
state a schematic repository has *is* its index.

`diff(from:to:)`, `diffHead()`, `blame(vertex:)`, `pushStash()`, and `popStash()` round out the
thirteen `pp_vcs_*` entry points. For a walk whose depth is decided by what the commits say:

```swift
for try await commit in repository.history() { ... }
```

`CommitHistory` is an `AsyncSequence` that pages, `history(pageSize:)` starting at 64 and
doubling the window each time so the whole walk stays within twice the commits delivered. It is
anchored at the commit HEAD resolved to when the
first page was read, so commits recorded above it during the walk neither repeat nor displace. It
borrows the handle rather than owning it, and moving HEAD off that commit's history leaves it with
nothing to continue from, at which point it fails rather than resuming elsewhere.

## Instances, I/O, and compatibility

```swift
let registry = try await IoRegistryHandle.builtin()
let names = try await registry.protocolNames()   // authority on what this build carries
let instance = try await registry.parseInstance(
    recordJSON, protocolName: "atproto", schema: schema)
let emitted = try await registry.emitInstance(
    instance, protocolName: "atproto", schema: schema)
```

A protocol whose codec is functor-native rather than W-type native answers an `FInstance`, which
this package does not model as a wire type; reach for `parseInstancePayload` and
`emitInstancePayload` there and treat the bytes as opaque. The functor-native codecs in the
default build are the line-oriented ones: `redis`, `swift_mt`, `edi_x12`, `conllu`.

`SchemaHandle.instance(fromJSON:rootVertex:)` and `json(for:)` are the direct JSON path, and
`violations(in:)` validates an instance, answering messages rather than throwing.

```swift
let diff = try await old.diff(to: new)           // SchemaDiff, every category
let report = try await atproto.classify(diff)
report.classification   // .fullyCompatible / .backwardCompatible / .breaking
print(try await report.renderedText())
```

The receiver is the older schema.

**Three diff shapes cross this boundary and they are not interchangeable**, which is the single
easiest way to write Swift that compiles somewhere else and not here:

| Type | Produced by | Consumed by |
| --- | --- | --- |
| `SchemaDiff` | `diff(to:)` | `classify(_:)` |
| `StructuralDiff` | `structuralDiff(to:)` | nothing on this ABI |
| `DiffSpec` | you assemble it | `ProtolensChainHandle.fromDiff(_:from:to:)` |

`SchemaDiff` is the full report, every category, and the only thing `classify` reads.
`structuralDiff(to:)` is the lightweight one, vertices and edges alone, and it spells its
entries differently, so handing it to `classify` is a type error rather than a subtle wrong
answer. `DiffSpec` holds the same five categories as `StructuralDiff` but spells them the way
`SchemaDiff` does, and all five of its keys are required: the engine's type derives a default
but marks no field with one, so a payload that leaves a key out is refused rather than read as
empty.

Enrichment answers a new handle and leaves the receiver alone, so the four chain:
`addingCoercion(from:to:_:)`, `addingDefault(_:on:)`, `addingMerger(_:on:)`,
`addingPolicy(_:on:)`. Two things to get right. `addingCoercion` names two vertex *kinds* and an
`Expr`, not a vertex; the third argument is unlabeled. And `addingDefault` takes a `Value`, not
an `Expr`, despite the schema field it lands in being typed `Expr`. Only `addingMerger` and
`addingPolicy` refuse a vertex the schema does not carry.

```swift
let enriched = try await schema
    .addingDefault(.string("untitled"), on: "app.test.note:body:text")
    .addingMerger(MergerSpec(strategy: "union"), on: "app.test.note:body:text")
    .addingPolicy(PolicySpec(policy: "last_write_wins"), on: "app.test.note:body:text")
    .addingCoercion(from: "integer", to: "string", .variable("x"))
```

Fibers hang off the compiled migration **value**, not the handle:

```swift
let plan = try await lens.compiledMigration()
let fiber = try await plan.fiber(at: "note", of: instance)
let whole = try await plan.fiberDecomposition(of: instance)
```

## Errors

```swift
public enum PanprotoError: Error, Hashable, Sendable {
    case parse(Detail), migration(Detail), lens(Detail), schemaValidation(Detail)
    case check(Detail), existenceCheck(Detail), expr(Detail), gat(Detail)
    case io(Detail), vcs(Detail), gitBridge(Detail), project(Detail)
}
```

Twelve cases, one per family of operations. Every method is declared `throws(PanprotoError)`, so
the type is exact rather than existential, and a typed `catch` clause is exhaustive over every
case of the type rather than over the ones actually raised, which is why a well-written `catch`
still needs a trailing arm.

The C ABI collapses all engine failures into six status codes and a message, too coarse to branch
on, so the binding restores the distinctions from two sources. The **domain** comes from the call
site, which makes it exact: a lens failure and a VCS failure are never confusable, because
different code raised them. The **fault** is recovered from the envelope where the engine's
message is specific enough to recognize. `Detail` carries `status`, `operation` (the Swift method
name, such as `SchemaHandle.violations(against:)`), `envelope`, and `fault`.

`Fault` has five cases: `complementFingerprintMismatch(left:right:)`, `complementConflict(kind:key:)`,
`invalidHandle(handle:)`, `typeMismatch(expected:actual:)`, `panic(String)`. Recognition is
textual, pinned to `thiserror` format strings in the engine, and an unrecognized message leaves
the fault absent rather than mis-classifying it.

```swift
do {
    return try await lens.put(view: edited, complement: complement)
} catch .lens(let detail) {
    if case .complementFingerprintMismatch(let left, let right) = detail.fault {
        // The two complements were captured against different source schemas.
    }
    return nil
} catch {
    print(error.domain, error.detail.operation, error.detail.message)
    return nil
}
```

The two complement faults are worth catching by name: complement composition is a *partial*
monoid, defined exactly when two complements agree on every shared key, so disagreement is the
boundary of its domain of definition rather than a recoverable condition. `panic` is always an
engine bug, and it never tears the process down: every status-returning entry point is wrapped in
a `guard` that runs the body under `catch_unwind` and returns a status instead.
`typeMismatch` is comparable against a Swift type through `PanprotoHandle.slabVariant`. A missing
envelope alongside a non-ok status means the failing thread was not the draining thread, which the
engine actor makes impossible; treat it as an engine bug.

## What does not work

Each of these was checked against the source rather than carried over from another SDK's
documentation.

**The lens entry points take no protocol handle.** They resolve the protocol by looking the
schema's protocol *name* up in the builtin registry, and a name the registry does not carry falls
back to a synthesized default: three vertex kinds, no edge rules, no constraint sorts. So a
schema built against a protocol you defined through `ProtocolHandle.define(_:)` is aligned and
instantiated against that default rather than your rules, silently, with no failure to catch.
Five entry points document the fallback themselves: `ProtolensChainHandle.autoGenerate`,
`autoGenerateCandidates`, `instantiate`, `SymmetricLensHandle.fromSchemas`, and
`DataSetHandle.migrateForward`; `migrateBackward` generates the same lens from the same two
schemas and so inherits it. `complementSpec` is **not** affected: it asks what an already-built
chain drops at a schema, which needs no protocol rules. Where the protocol's own rules have to
hold, compile the chain from a DSL document instead. This affects Haskell identically; it is an
ABI shape, not a Swift shortfall.

**The complement carrier a data-set migration returns cannot be read back.** `migrateForward`
answers a `MigratedDataSet` whose `complement` is a `DataSetHandle`, and no method gets
`[Complement]` out of it: `instances()` refuses a carrier whose payload is not instances, and
`pp_data_get_migration_complement` takes CBOR bytes rather than a handle. To run `migrateBackward`
you must have captured the complements yourself, by projecting each record through the lens with
`CompiledMigrationHandle.get`. The binding's own test suite does exactly that.
`[Complement].validated()` round-trips a sequence you already hold to check the engine will read
it; it does not read the carrier.

**`findMorphisms` cannot tell you it was truncated.** The 1024-optima cap bounds every request and
the flag reporting it does not cross the ABI.

**Schema-document and IDL parsing are absent.** The only schema parser on the ABI is
`pp_schema_parse_atproto_lexicon`. Python reaches 106 JSON-document parsers and ten text and IDL
parsers; Swift reaches none of them.

**Hint-steered lens generation is absent.** The ABI takes a stringency string and nothing else, so
anchors, scope pairs, and exclusions cannot be expressed to the lens generator, though
`MorphismDomainConstraints` expresses them to `findSpan`.

**Theory loading is absent.** `TheoryHandle.create(_:)` takes a `Theory` value and
`fromJSONRecord(_:)` reads the engine's own record shape. There is no `from_yaml`, no
`from_nickel`, no `from_path`, and no schema-to-theory induction. `Term`, which is what a theory's
operations and equations are written in, has no parser across the boundary at all; only `Expr` has
`parse`.

**Version-control porcelain stops at thirteen operations.** Tags, rebase, cherry-pick, reset,
amend, bisect, reflog, the stash stack beyond push and pop, and data versioning are Python's, not
the ABI's.

**Runtime grammar override and lexicon bundles are absent.** No `extra_grammars`, no
`override_grammar`, no `parse_schema_bundle_project`.

**Cancellation is not observed inside a call**, for the reason given above.

**A tagged workspace checkout needs `bootstrap/dev-link.sh` before it builds.** Depending on the
mirror is unaffected, and always was: the mirror is published with the pin already rewritten. The
caveat is local. At v0.71.0 a checkout of the tag with nothing staged fell back to the release
pin, which names the previous release, and failed on a symbol that release predated. Run the
bootstrap script first. See the installation section.

Swift does reach seven surfaces Python does not, all ABI entry points `panproto-py` has no wrapper
for: instance queries, the graph fiber calculus, schema enrichment, the dataset and staleness
layer, symmetric lenses, evaluation in a model, and expression typechecking.

## Gates

Four CI gates keep the binding honest, and knowing what each checks tells you what to trust.

The **header-drift gate** regenerates `panproto.h` from the crate and requires it byte-identical
to the vendored copy, which is what catches a silent ABI change: the shims would still compile
and would call the wrong thing.

The **parity gate**, `Scripts/parity-gate.py`, checks three properties. Coverage: every entry
point declared in `panproto.h` and `panproto_gated.h` has a raw shim, the Swift name computed
mechanically by dropping `pp_` and converting snake_case to lowerCamelCase with no acronym
special-casing, `pp_init` to `initialize` being the single reserved rename. Liveness: every shim
is called from outside the raw layer. Exercise: every public method of the domain layer is named
by a test or an example. Running it prints the counts, which is the fastest way to confirm the
122 for yourself.

The **tutorial gate**, `Scripts/tutorial-gate.py`, type-checks the Swift listings the DocC
tutorial shows against the built modules, so the tutorial cannot drift from the API the way
prose does. Run `swift build` first; it needs the module search path.

The **lint gate** runs `swift format lint -r --strict` over `Sources`, `Tests`, `Examples`,
`Scripts`, and `Package.swift`, with `AllPublicDeclarationsHaveDocumentation` on, which is why
every public symbol carries a usable doc comment. Those comments are the most reliable reference
in the package, more specific than any summary including this one.

CI also builds each gated target on its own (`swift build --traits PANPROTO_PARSE --target
PanprotoParse`, and the same for the other two), which is what keeps the empty-module claim true.

## Further Reading

- [Swift SDK reference](https://panproto.dev/book/reference/sdk-swift.html)
- [Install the Swift SDK](https://panproto.dev/book/how-to/install/swift.html)
- [Find a span between two schemas](https://panproto.dev/book/how-to/spans.html)
- [How the morphism search works](https://panproto.dev/book/explanation/morphism-search.html)
- DocC catalogs in the package, which the lint gate keeps populated: `TheEngineActor`,
  `HandleLifecycle`, and `ErrorTaxonomy` in `Panproto.docc`, plus the `MigrateARecord` tutorial
  and its eight numbered listings; `TheValueLayer` and `TheCBORCodec` in
  `PanprotoStructural.docc`; `ScopedSessions` in `PanprotoVcs.docc`
- `bindings/swift/Examples/AtprotoPostMigration/` runs the whole pipeline on a real Bluesky
  lexicon and a real post record, and is a build target, so it compiles with the package
