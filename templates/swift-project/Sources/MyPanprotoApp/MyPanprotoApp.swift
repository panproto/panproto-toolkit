import Foundation
import Panproto
import PanprotoStructural

/// A starter panproto program: build two versions of an ATProto post
/// schema, then ask what they share.
///
/// The entry point is the `@main` type `swift package init` generates.
/// Renaming this file to `main.swift` would take the attribute away,
/// since `@main` is rejected in a file by that name; top-level code
/// there takes `try await` just as happily, so either shape works.
@main
struct MyPanprotoApp {
    /// Run the pipeline, reporting a failure on standard error.
    static func main() async {
        do {
            try await run()
        } catch {
            FileHandle.standardError.write(Data("my-panproto-app: \(error)\n".utf8))
            exit(1)
        }
    }

    /// Build both schema versions and span the first onto the second.
    ///
    /// Engine work runs on the `@PanprotoEngine` global actor, which is
    /// pinned to one thread because panproto-c keeps its last-error slot
    /// in thread-local storage. `PanprotoEngine.run` isolates a whole
    /// region at once, which is what keeps a handle from crossing a
    /// suspension and amortizes the actor hops over the whole pipeline
    /// rather than paying one per call.
    ///
    /// - Throws: `PanprotoError` from any engine call. Its `domain` says
    ///   which family of operations failed and its `detail.operation`
    ///   names the Swift method, so a failure is legible without a
    ///   breakpoint.
    static func run() async throws {
        try await PanprotoEngine.run {
            // 1. Pick a protocol. The name supplies the vertex kinds and
            //    the edge rules every build step below is checked
            //    against, and `ProtocolHandle.builtinNames()` lists the
            //    whole catalogue.
            let atproto = try ProtocolHandle.builtin("atproto")
            defer { atproto.release() }

            // 2. Build the first version.
            //
            //    ATProto has no `datetime` vertex kind: a timestamp is a
            //    `string` carrying the `format` constraint, which is what
            //    the lexicon parser emits. A record reaches its
            //    properties through an `object` vertex over a
            //    `record-schema` edge, so `post:body` is not decoration.
            //
            //    Nothing a statement records can fail, so the body
            //    neither throws nor suspends. The engine is the authority
            //    on whether the statements amount to a schema, and it
            //    says so from `build()`.
            let v1 = try SchemaBuilder(over: atproto) {
                Vertex(id: "post", kind: "record", nsid: "app.bsky.feed.post")
                Vertex(id: "post:body", kind: "object")
                Vertex(id: "post:body.text", kind: "string")
                Vertex(id: "post:body.createdAt", kind: "string")
                Edge(src: "post", tgt: "post:body", kind: "record-schema")
                Edge(src: "post:body", tgt: "post:body.text", kind: "prop", name: "text")
                Edge(
                    src: "post:body",
                    tgt: "post:body.createdAt",
                    kind: "prop",
                    name: "createdAt"
                )
                VertexConstraint(sort: "maxLength", value: "3000", on: "post:body.text")
                VertexConstraint(sort: "format", value: "datetime", on: "post:body.createdAt")
                Entry("post")
            }
            .build()
            defer { v1.release() }

            let schema = try v1.schema()
            print(
                """
                v1 built
                  protocol: \(schema.protocolName)
                  vertices: \(schema.vertexCount)
                  edges:    \(schema.edgeCount)
                """
            )

            // 3. The next version, with `createdAt` gone. Two schemas
            //    that were not built from each other are the ordinary
            //    case, and this pair is the easy one: it is the same
            //    shape minus a property.
            let v2 = try SchemaBuilder(over: atproto) {
                Vertex(id: "post", kind: "record", nsid: "app.bsky.feed.post")
                Vertex(id: "post:body", kind: "object")
                Vertex(id: "post:body.text", kind: "string")
                Edge(src: "post", tgt: "post:body", kind: "record-schema")
                Edge(src: "post:body", tgt: "post:body.text", kind: "prop", name: "text")
                VertexConstraint(sort: "maxLength", value: "3000", on: "post:body.text")
                Entry("post")
            }
            .build()
            defer { v2.release() }

            // 4. Ask what the two share. The answer is a span
            //    `v1 ← apex → v2`: the apex is the largest sub-schema of
            //    v1 that found a home in v2, and the search never refuses
            //    for want of a match. Two schemas with nothing in common
            //    come back with an empty apex and a coverage of zero
            //    rather than an error, which is why this is the first
            //    call to reach for on an unfamiliar pair.
            //
            //    The protocol is an argument because the apex is itself a
            //    schema, and inducing it re-validates it rather than
            //    assuming it: a schema stores only its protocol's name,
            //    so the protocol cannot be read back off the handle.
            //
            //    `monic` asks for an injective vertex map, and it is
            //    worth asking for here. Without it this pair spans
            //    totally at a coverage of 1.0, because the search is free
            //    to send both `post:body.text` and `post:body.createdAt`
            //    to the one string vertex v2 still has. So a coverage of
            //    1.0 does not on its own mean nothing was lost; it means
            //    everything found somewhere to go.
            let span = try v1.findSpan(
                to: v2,
                in: atproto,
                options: MorphismSearchOptions(monic: true)
            )
            print(
                """

                span v1 -> v2
                  apex vertices:  \(span.apex.vertexCount) of \(schema.vertexCount)
                  apex coverage:  \(span.apexCoverage)
                  quality:        \(span.quality) in \
                [\(span.qualityLo), \(span.qualityHi)]
                  proven optimal: \(span.provenOptimal)
                  total:          \(span.isTotal)
                  apex digest:    \(span.apexDigest)
                """
            )

            // 5. A total morphism is the degenerate span, so read it off
            //    rather than searching again. `nil` here does not mean
            //    the pair is unrelated; it means part of v1 has no home
            //    in v2, and the apex above says which part does.
            if let total = span.asTotalMorphism {
                print("  every v1 vertex has a home: \(total.vertexMap.count) mapped")
            } else {
                let dropped = schema.vertices.keys.filter { span.right.vertexMap[$0] == nil }
                print("  outside the apex: \(dropped.sorted().joined(separator: ", "))")
            }

            // --- Where to go next ---
            //
            // Classify the change rather than measure it. The receiver
            // is the older schema, and the protocol supplies the rules
            // the verdict rests on:
            //   let diff = try v1.diff(to: v2)
            //   let report = try atproto.classify(diff)
            //   print(try report.renderedText())
            //
            // Read the span back as the identification list a pushout
            // takes, which is what merging the two schemas needs:
            //   let overlap = try span.overlap()
            //
            // Carry records across. Unlike the span search this refuses
            // when no morphism survives the tier, so it is the second
            // call rather than the first. Both results are handles, so
            // both want a `release()` on the way out:
            //   let chain = try ProtolensChainHandle.autoGenerate(from: v1, to: v2)
            //   let lens = try chain.instantiate(at: v1)
            //   let projected = try lens.get(record)
        }
    }
}
