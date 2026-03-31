"""panproto quick-start: define a schema, diff two versions, auto-generate a lens."""

import panproto


def main() -> None:
    # Load a built-in protocol (50 available)
    proto = panproto.get_builtin_protocol("atproto")

    # Build a schema using the fluent builder
    builder = proto.schema()
    builder.vertex("post", "record", "app.bsky.feed.post")
    builder.vertex("post:body", "object")
    builder.vertex("post:body.text", "string")
    builder.vertex("post:body.createdAt", "datetime")
    builder.edge("post", "post:body", "record-schema")
    builder.edge("post:body", "post:body.text", "prop", "text")
    builder.edge("post:body", "post:body.createdAt", "prop", "createdAt")
    builder.constraint("post:body.text", "maxLength", "3000")
    builder.constraint("post:body.createdAt", "required", "true")
    schema = builder.build()

    print("Schema built successfully!")

    # --- Diff two schema versions ---
    # report = panproto.diff_and_classify(old_schema, new_schema, proto)
    # print(report.compatible)       # True/False
    # print(report.report_text())    # human-readable summary

    # --- Auto-generate a lens ---
    # lens, quality = panproto.auto_generate_lens(old_schema, new_schema, proto)
    # view, complement = lens.get(instance)

    # --- Convert data ---
    # registry = panproto.IoRegistry()
    # instance = registry.parse("atproto", json_bytes)
    # output = registry.emit("openapi", instance)


if __name__ == "__main__":
    main()
