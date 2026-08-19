use panproto_core::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load a built-in protocol (54 available).
    // `panproto-core` re-exports every library crate, so `protocols`,
    // `schema`, `check`, `lens` and `mig` are all reachable from this one
    // dependency.
    let proto = protocols::atproto::protocol();

    // Build a schema using the fluent builder.
    // ATProto has no `datetime` object kind: a timestamp is a `string`
    // carrying the `format` constraint, which is what the lexicon parser
    // emits and what `schema validate` accepts.
    let schema = schema::SchemaBuilder::new(&proto)
        .vertex("post", "record", Some("app.bsky.feed.post"))?
        .vertex("post:body", "object", None)?
        .vertex("post:body.text", "string", None)?
        .vertex("post:body.createdAt", "string", None)?
        .edge("post", "post:body", "record-schema", None)?
        .edge("post:body", "post:body.text", "prop", Some("text"))?
        .edge("post:body", "post:body.createdAt", "prop", Some("createdAt"))?
        .constraint("post:body.text", "maxLength", "3000")
        .constraint("post:body.createdAt", "format", "datetime")
        .build()?;

    println!(
        "Schema built: {} vertices, {} edges.",
        schema.vertex_count(),
        schema.edge_count()
    );

    // --- Diff two schema versions ---
    // let diff = check::diff(&old_schema, &new_schema);
    // let report = check::classify(&diff, &proto);
    // println!("{}", check::report_text(&report));

    // --- Auto-generate a lens ---
    // `auto_generate` takes the protocol and a config alongside the two
    // schemas, and answers with the chain, the instantiated lens, and the
    // alignment quality.
    // let config = lens::AutoLensConfig::default();
    // let result = lens::auto_generate(&old_schema, &new_schema, &proto, &config)?;
    // let (view, complement) = lens::get(&result.lens, &instance)?;

    // --- Ask what two schemas share ---
    // `find_span` never refuses for want of a match: two schemas with
    // nothing in common come back with an empty apex and an
    // `apex_coverage` of zero rather than an error. Reach for it wherever
    // `auto_generate` reports that no morphism was found.
    // let span = mig::find_span(
    //     &old_schema,
    //     &new_schema,
    //     &proto,
    //     &mig::SearchOptions::default(),
    // )?;
    // println!("apex covers {:.0}% of the source", span.apex_coverage * 100.0);
    // println!("proven optimal: {}", span.certificate.proven_optimal);
    // let total = span.as_total_morphism(); // Some(_) in the degenerate, total case

    // --- Enumerate the optimal total morphisms ---
    // `find_morphisms` returns a `MorphismList` rather than a bare vector:
    // `truncated` separates a list the result cap cut from a list the pair
    // exhausted. An empty `morphisms` means no total morphism exists.
    // let found = mig::find_morphisms(&old_schema, &new_schema, &mig::SearchOptions::default())?;
    // println!("{} optima, truncated: {}", found.morphisms.len(), found.truncated);

    Ok(())
}
