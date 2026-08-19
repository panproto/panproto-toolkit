"""panproto quick-start: define a schema, diff two versions, auto-generate a lens."""

import panproto


def main() -> None:
    # Load a built-in protocol (54 available)
    proto = panproto.get_builtin_protocol("atproto")

    # Build a schema using the fluent builder.
    # ATProto has no `datetime` object kind: a timestamp is a `string`
    # carrying the `format` constraint, which is what the lexicon parser emits.
    builder = proto.schema()
    builder.vertex("post", "record", "app.bsky.feed.post")
    builder.vertex("post:body", "object")
    builder.vertex("post:body.text", "string")
    builder.vertex("post:body.createdAt", "string")
    builder.edge("post", "post:body", "record-schema")
    builder.edge("post:body", "post:body.text", "prop", "text")
    builder.edge("post:body", "post:body.createdAt", "prop", "createdAt")
    builder.constraint("post:body.text", "maxLength", "3000")
    builder.constraint("post:body.createdAt", "format", "datetime")
    schema = builder.build()

    print("Schema built successfully!")

    # --- Diff two schema versions ---
    # report = panproto.diff_and_classify(old_schema, new_schema, proto)
    # print(report.compatible)       # True/False
    # print(report.report_text())    # human-readable summary

    # --- Auto-generate a lens ---
    # The third element is the list of sort-coercion proposals, which is
    # empty at every stringency tier but "exploratory".
    # lens, quality, coerce_proposals = panproto.auto_generate_lens(
    #     old_schema, new_schema, proto
    # )
    # view, complement = lens.get(instance)

    # --- Ask what two schemas share ---
    # find_span never refuses for want of a match: two schemas with nothing
    # in common come back with an empty apex and an apex_coverage of zero.
    # Reach for it wherever auto_generate_lens reports no morphism.
    # span = panproto.find_span(old_schema, new_schema, proto)
    # print(span.apex_coverage, span.is_total, span.apex_digest)
    # total = span.as_total_morphism()   # None unless the span covers the source

    # --- Convert data ---
    # parse and emit both take the schema the bytes are read or written
    # against, alongside the protocol name.
    # registry = panproto.IoRegistry()
    # instance = registry.parse("atproto", schema, json_bytes)
    # output = registry.emit("openapi", openapi_schema, instance)


if __name__ == "__main__":
    main()
