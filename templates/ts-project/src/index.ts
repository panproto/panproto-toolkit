import { Panproto } from "@panproto/core";

async function main(): Promise<void> {
  // Initialize panproto (loads WASM module)
  const p = await Panproto.init();

  // Pick a protocol (54 available: atproto, openapi, avro, protobuf, sql, graphql, ...)
  // `protocol()` reads the WASM registry, so a built-in resolves to the
  // same definition panproto's own parsers validate against.
  const proto = p.protocol("atproto");

  // Define a schema using the fluent builder.
  // ATProto has no `datetime` object kind: a timestamp is a `string`
  // carrying the `format` constraint, which is what the lexicon parser emits.
  const schema = proto
    .schema()
    .vertex("post", "record", { nsid: "app.bsky.feed.post" })
    .vertex("post:body", "object")
    .vertex("post:body.text", "string")
    .vertex("post:body.createdAt", "string")
    .edge("post", "post:body", "record-schema")
    .edge("post:body", "post:body.text", "prop", { name: "text" })
    .edge("post:body", "post:body.createdAt", "prop", { name: "createdAt" })
    .constraint("post:body.text", "maxLength", "3000")
    .constraint("post:body.createdAt", "format", "datetime")
    .build();

  console.log("Schema built successfully!");

  // --- Diffing two schema versions ---
  // `diffFull` reports the raw change set across 20+ categories;
  // classifying it against a protocol is what produces a verdict.
  // const changes = p.diffFull(oldSchema, newSchema);
  // console.log(changes.hasChanges);
  // const report = changes.classify(proto);
  // console.log(report.isCompatible);      // boolean
  // console.log(report.breakingChanges);   // the changes that break clients
  // console.log(report.toText());          // human-readable summary

  // --- Auto-generate a lens ---
  // using chain = p.protolensChain(oldSchema, newSchema);
  // using lens = chain.instantiate(oldSchema);
  // const { view, complement } = lens.getJson(record, "post");
  // const back = lens.putJson(view, complement, "post");
  //
  // A view read back from storage has no in-process complement. When the
  // lens is an isomorphism, reconstruct from the view alone:
  // if (lens.isIsomorphism()) {
  //   const source = lens.putJsonWithoutComplement(view, "post");
  // }

  // --- Ask what two schemas share ---
  // `lens` and `protolensChain` throw when no alignment is found. `span`
  // always answers: two schemas with nothing in common come back with an
  // empty apex and an `apex_coverage` of zero, and `apex_digest` is a
  // value a caller can key a cache on.
  // const span = p.span(oldSchema, newSchema);
  // console.log(span.apex_coverage, span.is_total, span.apex_digest);

  // --- Convert data ---
  // const converted = await p.convert(record, { from: oldSchema, to: newSchema });
}

main().catch(console.error);
