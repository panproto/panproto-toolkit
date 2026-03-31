import { Panproto } from "@panproto/core";

async function main(): Promise<void> {
  // Initialize panproto (loads WASM module)
  const p = await Panproto.init();

  // Pick a protocol (50 available: atproto, openapi, avro, protobuf, sql, graphql, ...)
  const proto = p.protocol("atproto");

  // Define a schema using the fluent builder
  const schema = proto
    .schema()
    .vertex("post", "record", { nsid: "app.bsky.feed.post" })
    .vertex("post:body", "object")
    .vertex("post:body.text", "string")
    .vertex("post:body.createdAt", "datetime")
    .edge("post", "post:body", "record-schema")
    .edge("post:body", "post:body.text", "prop", { name: "text" })
    .edge("post:body", "post:body.createdAt", "prop", { name: "createdAt" })
    .constraint("post:body.text", "maxLength", "3000")
    .constraint("post:body.createdAt", "required", "true")
    .build();

  console.log("Schema built successfully!");

  // --- Diffing two schema versions ---
  // const diff = p.diff(oldSchema, newSchema);
  // const report = p.diffFull(oldSchema, newSchema);
  // console.log(report.level);        // 'compatible' | 'backward' | 'breaking'
  // console.log(report.reportText());  // human-readable summary

  // --- Auto-generate a lens ---
  // const chain = p.protolensChain(oldSchema, newSchema);
  // const result = chain.apply(record);

  // --- Convert data ---
  // const converted = p.convert(record, oldSchema, newSchema);
}

main().catch(console.error);
