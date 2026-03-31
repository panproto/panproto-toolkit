use panproto_core::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load a built-in protocol (51 available)
    let proto = panproto_protocols::atproto::protocol();

    // Build a schema using the fluent builder
    let schema = schema::SchemaBuilder::new(&proto)
        .vertex("post", "record", Some("app.bsky.feed.post"))?
        .vertex("post:body", "object", None)?
        .vertex("post:body.text", "string", None)?
        .vertex("post:body.createdAt", "datetime", None)?
        .edge("post", "post:body", "record-schema", None)?
        .edge("post:body", "post:body.text", "prop", Some("text"))?
        .edge("post:body", "post:body.createdAt", "prop", Some("createdAt"))?
        .constraint("post:body.text", "maxLength", "3000")
        .constraint("post:body.createdAt", "required", "true")
        .build()?;

    println!("Schema built successfully!");

    // --- Diff two schema versions ---
    // let diff = panproto_check::diff(&old_schema, &new_schema);
    // let report = panproto_check::classify(&diff, &proto);
    // println!("{}", report.report_text());

    // --- Auto-generate a lens ---
    // let lens = panproto_lens::auto_generate(&old_schema, &new_schema)?;
    // let (view, complement) = panproto_lens::get(&lens, &instance)?;

    Ok(())
}
