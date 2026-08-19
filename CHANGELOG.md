# Changelog

## [0.19.0] - 2026-08-19

Adds the Swift SDK skill and a Swift project template. panproto has shipped a Swift SDK since v0.70.0, and `docs/skills-guide.md` has carried the missing skill as a known gap since; this closes it.

### Added

- **`skills/sdk-swift`**: a full reference for the SwiftPM package, at the depth of `sdk-rust` and `sdk-python`. Covers installation against the published XCFramework versus a dev-linked workspace checkout; the module layout, including the trait-gated `PanprotoParse`, `PanprotoProject` and `PanprotoGit` tiers and the 105-of-122 entry-point split; `PanprotoEngine` as an `actor` and what handle lifetime means for a caller, which no other SDK skill has an analogue for; `PanprotoStructural` as the offline value layer whose `Codable` conformances are the CBOR shapes; the span search, with `SchemaHandle.findSpan(to:in:options:constraints:)`, the eleven-key `SchemaSpan`, and `overlap()`; migrations, lenses and VCS with worked examples; the `PanprotoError` cases; and the limitations, including that the ABI's lens entry points take no protocol handle, so a schema built against a caller-defined protocol is aligned against a synthesised default.
- **`templates/swift-project`**: `Package.swift`, `panproto.toml` and a starter source file, mirroring the TypeScript, Python and Rust templates. It depends on the `panproto/panproto-swift` mirror, since SwiftPM resolves a package URL by looking for a `Package.swift` at the repository root and the SDK lives at `bindings/swift`.
- **`skills/getting-started`**: the Swift scaffolding path, so all four SDKs are reachable from `/getting-started`.

### Changed

- **`docs/skills-guide.md`**: the known-gap note about the missing Swift skill is replaced by the skill's index entry. `README.md`, `docs/installation.md` and `docs/tutorial-map.md` list Swift alongside the other SDKs.
- **MCP server**: own version `0.18.0` to `0.19.0`, in `package.json`, the `server.ts` literal and the lockfile.

### A note on the install caveat

An earlier draft of the Swift skill said panproto v0.71.0's Swift package does not build from its own tag. That was wrong about who it affects, and the skill says the accurate thing: consumers resolve the `panproto-swift` mirror, which is published with its pin already rewritten and builds. The caveat is local to a workspace checkout of a tag with nothing staged, and `bootstrap/dev-link.sh` is the remedy. panproto has since changed the manifest so a workspace checkout no longer falls back to a released artifact at all.

## [0.18.0] - 2026-08-19

Catches the toolkit up across panproto v0.61.0 to v0.71.0. The headline is v0.71.0, which replaces the morphism search with exact optimisation over a cost function network and changes the contract of every entry point into it, so the migration and lens skills carried examples a reader could no longer run.

### Fixed

- **`skills/use-lenses`, `skills/build-migration`, `skills/lens-dsl`, `skills/protolenses`**: the search API moved under them. `find_morphisms` returns a `MorphismList` carrying a truncation flag rather than a `Vec`, and its 1024-result cap now bounds every request rather than only the unbounded one; `find_span` is the entry point to reach for, and it never refuses for want of a match; `discover_overlap` takes a `&Protocol` and returns a `Result`; `SearchOptions::initial` is now `hard_pins`, and `preferred`, `max_nodes`, `relax_edge_name_pruning` and `DomainConstraints::name_similarity_threshold` are gone; `AutoSpec::max_search_depth` is now `max_results`.
- **`skills/use-lenses`**: the naturality-aware pre-exclusion described since 0.38.0 no longer exists. Three local feasibility scans populated `excluded_sources` before the search ran and were stricter than the search itself, so a root whose only outgoing edge had no target counterpart was dropped along with the orphan leaf. The objective decides alone now, and `auto_generate` keeps the better of the pinned and released searches on quality first with coverage as the tie-break.
- **`mcp-server`**: `panproto_auto_migrate` documented an `alignmentStrategies` summary with `anchorCount` and `meanConfidence` that panproto has never emitted, and attributed the answer to the 14-strategy alignment ladder, which seeds lens generation rather than this command. It now describes the span, the apex coverage, the quality interval, and the `--total` / default / `--span` strictness ladder.
- **`mcp-server`**: `panproto_lens_verify` promised round-trip law checks the CLI cannot reach. `schema lens verify` passes no data path to the verifier, so it prints "No test data provided; skipping concrete law checks" and stops; the tool now says so and points at the Python and WASM bindings, and its first argument is labelled the source schema rather than test data.
- **`mcp-server`**: `panproto_classify` claimed a bare source tree is a valid operand. A protocol is required there, so a directory must be manifest-backed or hold documents in that protocol.
- **`templates/rust-project`**: `auto_generate` takes four arguments and returns an `AutoLensResult`, where the template called it with two and used the value as a lens.

### Added

- **`skills/build-migration`, `skills/sdk-*`**: the span search across every surface. `find_span` returns `src <- apex -> tgt` with a `SpanCertificate` recording what was proved; it reached the C ABI as `pp_hom_find_span` and `pp_hom_span_to_overlap`, WASM and TypeScript as `auto_generate_span` and `Panproto.span`, and Swift as `findSpan(to:in:options:constraints:)`. The span wire carries `apex_digest` and `legs_are_functorial`, which together with the leg maps is a span's identity.
- **`skills/sdk-haskell`**: `HomBackend` gained `findSpan` and `spanToOverlap` with no defaults and a `ProtocolBackend` superclass, so an out-of-tree instance stops compiling.
- **`skills/sdk-python`**: `FoundMorphism.edge_map`, and `to_dict()` gaining a third key.
- **`skills/schema-vcs`, `skills/breaking-change-ci`**: `schema compat` and `schema diff` accept project directories, and `schema integrate` resolves a protocol on every path.
- **`skills/define-schema`, `skills/cross-protocol`**: `panproto_schema::induce` and `canonical_digest` are public API, and the four protocols restored in 0.61.0 (`json-schema`, `graphql`, `sql`, `protobuf`) are first-class endpoints again.

### Changed (versions)

- **Templates**: panproto v0.71.0 (TS `@panproto/core ^0.71.0`, Python `panproto>=0.71.0`, Rust `panproto-core 0.71.0`).
- **MCP server**: own version `0.17.0` to `0.18.0`, in `package.json`, the `server.ts` literal and the lockfile, which had rotted at an older `@panproto/core`.

### Known gaps

- No `sdk-swift` skill, though panproto has shipped a Swift SDK since v0.70.0. `docs/skills-guide.md` records the gap and points at the book.
- The Haskell binding is not on Hackage at any version, so `skills/sdk-haskell` builds from the repository.

## [0.17.0] - 2026-07-22

Catches the toolkit up across panproto v0.56.0 → v0.60.0, and corrects two skills whose expression-language examples documented an API panproto does not have.

### Fixed

- **`skills/expression-language`**: the builtin catalogue was fictional — it documented Haskell-Prelude-style names panproto never had (`toUpper`, `substring`, `startsWith`, `endsWith`, `regex`, `foldl`/`foldr`, `init`, `last`, `take`, `drop`, `sort`, `unique`, `flatten`, `zip`, `enumerate`, `any`, `all`, `elem`, `lookup`, `parseInt`, `parseFloat`, `toString`). Replaced it with the real 60-builtin catalogue verified against `resolve_builtin` in the parser and the `BuiltinOp` signatures: correct names (`upper`/`lower`, `slice`, `str_to_int`, the single `fold`, `flat_map`, the coercions, type-inspection, graph-traversal), literals (`True`/`False`/`Nothing`, not `true`/`false`/`null`), record syntax (`{ a = 1 }`, not `{ a: 1 }`), the pipe operator (`&`), and function-first surface order for `map`/`filter`/`fold`.
- **`skills/query-instances`**: the same fictional builtins and syntax in the query examples, corrected the same way. Membership predicates now use the real `contains [list] elem` overload; a prefix test uses `slice s 0 n == "…"`; examples that could not be expressed in the real language (a `regex` predicate, a dynamic-string-key group-by) were dropped rather than faked.
- **`skills/field-transforms`**: leftover fictional names in the expression cheat-sheet (`foldl`, `toUpper`/`toLower`, `parseInt`) and backwards `split`/`join` argument order corrected.

### Added

- **`skills/expression-language`**: the `range(start, stop)` builtin and its `[a..b]` surface syntax (both bounds inclusive; `[a..]` unsupported), and the `contains` overload — substring on a string, exact-element membership on a list (panproto v0.60.0).
- **`skills/field-transforms`**: list- and record-valued transforms now work. A transform whose expression reads or returns an array or nested-object field used to silently no-op (scalar-only); as of v0.60.0 the value/expression conversion is structure-preserving, so `map`/`fold`/`filter`, field projection, and flat-to-nested regroups over inline ATProto arrays and objects apply. Also: a field transform that fails to evaluate is now reported (`RestrictError::FieldTransformFailed`) instead of silently succeeding.
- **`skills/use-lenses`, `skills/lens-dsl`**: value-transform lens steps (`apply_expr`, `compute_field`, `hoist_field`, `nest_field`) are reachable from the TypeScript/JavaScript SDK via `compileLensDocument` and now apply through `get`/`put` (v0.59.0); `chain.fieldTransforms()` lists them. `optic_kind` now classifies a structurally-bijective migration carrying a lossy value transform as `Lens`, not `Iso` (v0.60.0).
- **`skills/cross-protocol`, `skills/sdk-python`**: cross-document schema references resolve via bundle parsing — `parseSchemaBundle(protocol, docs)` / `parse_schema_bundle(...)` (v0.59.0), so an ATProto lexicon ref into a sibling document lands on a real typed vertex instead of an opaque placeholder.
- **`skills/schema-vcs`**: `Repository.add_data(path, key=None)` records an optional per-record caller key carried across data migration, and data-only / protocol-only commits no longer raise `NothingStaged` (v0.56.0).
- **`skills/convert-data`, `skills/format-preserving`**: the JSON/XML/YAML/TOML/CSV codecs are documented as value-preserving (v0.57.0).

### Changed (versions)

- **Templates**: bumped to panproto v0.60.0 (TS: `@panproto/core ^0.60.0`, Python: `panproto>=0.60.0`, Rust: `panproto-core 0.60.0`).
- **MCP server**: own version `0.16.0` → `0.17.0` (and the `server.ts` version literal, previously stranded at `0.15.0`, brought into sync); `README.md` and `mcp-server/README.md` now read panproto v0.60.0. The `schema` CLI flag surface the server wraps is unchanged across v0.56.0–v0.60.0 (the changes flow through existing flags), so the tool set is unchanged.

## [0.16.0] - 2026-06-17

Catches the toolkit up across panproto v0.53.0 → v0.55.0. The headline is the **Haskell SDK reaching full parity** with the Python and TypeScript SDKs (v0.55.0), over a `panproto-c` C ABI expanded to 123 frozen `pp_*` entry points; the two intervening releases added ATProto lexicon parsing and schema→theory extraction to the Python SDK (v0.53.0) and a VCS `data_at` committed-data read accessor (v0.54.0).

### Changed

- **`skills/sdk-haskell`**: rewritten from a pre-parity stub (v0.41.0, three typeclasses, thread-local slab) to the full v0.55.0 surface: the per-domain capability typeclasses (`MigrationBackend`, `LensBackend`, `GatBackend`, …) over `Native` and `Rust` backends; the **process-global** handle slab (handles stay valid across OS threads under GHC's threaded RTS); standard-class integration (`Migration` as an associative `Semigroup` with the per-schema `identityMigrationOn` identity rather than a `Monoid`, `ProtolensChain` as a `Monoid`/`Category`, `OpticKind` as a lattice `Monoid`, the `SomePanprotoError` exception hierarchy, `Hashable`/`Eq`/`Ord`); `State`-monad builders; the built-in `MonadPanproto` effect layer plus the `effectful` effect; the delta-lens `optics`/`lens` adaptors; the cabal flag matrix; and the `dev-link.sh` / `fetch-bindist.sh` bootstrap.

### Added

- **`skills/sdk-python`**: ATProto lexicon parsing (`parse_atproto_lexicon`, `parse_schema_document`, `Schema.from_atproto_lexicon`) and schema→theory extraction (`theory_of`, `Schema.theory`) from v0.53.0; committed-data access (`Repository.data_at`, `Repository.add_data`) from v0.54.0. Surface summary updated to 37 module-level functions.
- **`skills/schema-vcs`** and **`agents/vcs-assistant`**: documented `Repository.data_at(ref)` (v0.54.0) — reads the data sets committed at a branch/tag/commit-id without moving `HEAD` or the working tree, the read-only contrast to `checkout --migrate`. Noted that it is an SDK API with no CLI equivalent.
- **Haskell as a first-class SDK** across the docs: `README.md` (SDK-guides table, language count corrected to 261), `docs/installation.md` (build-from-source path), and `docs/skills-guide.md` (reference-skill list and the "examples across the SDKs" note).

### Changed (versions)

- **Templates**: bumped to panproto v0.55.0 (TS: `@panproto/core ^0.55.0`, Python: `panproto>=0.55.0`, Rust: `panproto-core 0.55.0`).
- **MCP server**: own version `0.15.0` → `0.16.0`; `README.md` and `mcp-server/README.md` now read "panproto v0.55.0". The `schema` CLI surface the server wraps is unchanged across v0.53.0–v0.55.0 (the new features are SDK-only), so the 72-tool set is unchanged.

### Changed (post-release)

- **`mcp-server/package.json`**: the (unused at runtime; the server shells out to the `schema` CLI) `@panproto/core` dependency bumped `^0.52.1` → `^0.55.0`, now that `@panproto/core@0.55.0` is published to npm.

### Pending (manual)

- **`@panproto/mcp-server@0.16.0` npm publish**: still a manual `npm login` step (the toolkit CI publish token lacks `@panproto` scope). Run `npm install && npm run build && npm publish` from `mcp-server/` to regenerate the lockfile against `@panproto/core@0.55.0` and publish.

## [0.15.0] - 2026-06-15

Catches the toolkit up across panproto v0.50.3 → v0.52.1. The headline is source-code emit: panproto's `emit_pretty` was rewritten around grammar-derived token roles (0.51.0) and verified against a strict round-trip oracle over the upstream `test/corpus/` of 255 of 261 vendored grammars (0.52.0, up from 16), and 0.52.1 closed the remaining by-construction gaps (line-comment line breaks, opaque token trees, julia paren-form macro calls) plus resynced the Python `_native.pyi` stub to the runtime.

### Changed

- **`skills/full-ast-parsing`**: 259 → 261 languages (BUGS/JAGS vendored in 0.52.0); added an **Emit verification status** section covering the grammar-derived token-role rewrite (0.51.0), the strict 255/261 round-trip oracle (0.52.0), the `ParserRegistry::emit_verification_status()` tiers (`Verified` / `Generic` / `Unsupported`), and the AST-round-trip bar for by-construction emit; corrected "250 vendored grammars" → 261.
- **`skills/decorate-schemas`**: documented the new **layout calculus vocabulary** (`LayoutRole`, `Adjacency`, `LayoutSpec` / `RuleLayout`) exposed by `panproto-gat` in 0.52.0; completed the layout-constraint-sort list (`ptrace-N`, `doc-prefix`, and `blank-lines-before` — reclassified as a layout sort in 0.52.1) and noted which sorts survive `forget_layout`.
- **`skills/sdk-rust`**: dependency example bumped to `panproto-core = "0.52"`.
- **Python SDK API**: verified the toolkit's `diff_and_classify(old, new, protocol)`, `ProtolensChain.instantiate(schema, protocol)`, and `Instance.root`/`node_count`/`arc_count` (properties) / `validate()` (error list) / `from_json` (staticmethod) usages already match the runtime that 0.52.1's `_native.pyi` resync now also advertises — no changes needed.
- **Counts**: 259 → 261 languages across `README.md`, `mcp-server` grammar/protocol resources, and the `panproto_parse_file` tool description.
- **Templates**: bumped to panproto v0.52.1 (TS: `@panproto/core ^0.52.1`, Python: `panproto>=0.52.1`, Rust: `panproto-core 0.52.1`).
- **Version**: MCP server bumped `0.14.0` → `0.15.0`; `README.md` and `mcp-server/README.md` now read "panproto v0.52.1".

## [0.14.0] - 2026-05-26

Catches the toolkit up across eight panproto releases (v0.45.0 → v0.50.3). The centerpiece is the MCP server security and governance layer: every tool is classified by risk, destructive operations gate on MCP elicitation-based user approval, and all invocations are audit-logged. The server also expands from 41 to 72 tools, covering the full CLI surface including VCS write operations, git bridge, and enrichment management.

### Added

- **MCP server security layer**: tool classification registry (`policy/tool-catalog.ts`), elicitation-based approval gates for destructive operations (`policy/engine.ts`), session audit log (`policy/audit.ts`), and a `panproto_session_audit` tool to inspect the log.
- **Tool annotations on every tool**: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` via MCP `ToolAnnotations`.
- **31 new MCP tools**: VCS write (init, add, commit, checkout, branch create/delete, tag create/delete, merge, rebase, cherry-pick, reset, stash push/pop, gc), VCS read (show, reflog, bisect, branch list, tag list, stash list), schema verify, enrichment (add-merger, add-policy, remove), lens (check, lift), expression (gat-eval, gat-check, check), data sync, git bridge (import, export). Removed 3 tools that referenced nonexistent CLI subcommands (`lens pipeline`, `data parse --format-preserving`, `data emit`). Reclassified `panproto_lift` from write-destructive to read (it only prints to stdout).
- **3 new MCP prompts**: `vcs-workflow` (init → commit → branch → merge guide), `cross-protocol-translation`, `code-schema-diff`.
- **`outputSchema` on priority tools**: `panproto_health`, `panproto_session_audit` return `structuredContent`.
- **`skills/decorate-schemas`**: new skill covering `AbstractSchema`/`DecoratedSchema`, `ParserRegistry::decorate()`, `LayoutPolicy`, the section law, Grothendieck fibration framing, `TheoryTransform::StripEnrichment`/`AddEnrichment`, cross-crate `LayoutEnricher` registry.
- **`skills/sdk-haskell`**: new skill covering Haskell bindings via `panproto-c` (safer-ffi C ABI), Native vs Rust backends, capability typeclasses, handle-based hot path, CBOR cold path.
- **`agents/code-transform`**: new agent for parse → protolens → emit code refactoring pipeline.

### Changed

- **MCP server**: all 72 tools registered via `registerTool()` (non-deprecated path) with deterministic alphabetical ordering for LLM prompt cache consistency. Version bumped from `0.12.1` to `0.14.0`.
- **`skills/full-ast-parsing`**: 248 → 259 languages; added parse/decorate/emit protolens (v0.48.0), runtime grammar override (v0.47.0), anonymous token field text query (v0.47.0), IdGenerator disambiguation (v0.50.0), emit_pretty corrections.
- **`skills/sdk-python`**: added hom_search/cascade (`find_morphisms`, `find_best_morphism`, `induce_schema_morphism`, `induce_migration_from_theory` + `TheoryMorphism`/`SchemaMorphism`/`FoundMorphism`), `TheoryBuilder` fluent API, Theory loaders (`from_json`/`from_yaml`/`from_nickel`/`from_path`), ProtolensChain DSL loaders, lens combinators (`rename_field`, `remove_field`, `add_field`, `hoist_field`, `pipeline`, `auto_generate_lens_candidates`), `AstParserRegistry.override_grammar()`, `PySchema.field_text()`. Updated counts: 32 classes + 34 functions.
- **`skills/sdk-rust`**: version bump to 0.50; noted `Protocol::from_theories`, `AbstractSchema`/`DecoratedSchema` split, `Grammar` now `#[non_exhaustive]`, `Complement::compose` returns `Result`.
- **`skills/expression-language`**: updated description to 59 builtins (was ~50), including graph traversal builtins (Edge, Children, HasEdge, EdgeCount, Anchor).
- **`skills/format-preserving`**: updated description to include parse/decorate/emit protolens (v0.48.0+), `LayoutPolicy`, Grothendieck fibration framing.
- **`skills/companion-grammar-packs`**: 248 → 259 languages; BUGS/JAGS grammars; .musicxml on xml protocol.
- **Resources**: `panproto://grammars` updated to 259 languages with Statistical and Music categories; `panproto://protocols` updated with full annotation protocol list.
- **Templates**: all bumped to panproto v0.50.0 (TS: `@panproto/core ^0.50.0`, Python: `panproto>=0.50.0`, Rust: `panproto-core 0.50.0` with edition 2024).
- **All 5 agents**: version references updated from v0.45.0 to v0.50.3.
- **`docs/mcp-server-guide.md`**: added Security and Approvals section; updated tool count from 18 to 75.
- **`mcp-server/package.json`**: `@modelcontextprotocol/sdk ^1.29.0`, `@panproto/core ^0.50.0`.
- **`README.md`**: "Written for panproto v0.50.3".

## [0.13.0] - 2026-05-06

Catches the toolkit up across six panproto releases (v0.40.0 → v0.45.0). Last refresh was for v0.39.0; this release covers `emit_pretty` / `ParseEmitLens` (0.40), the Haskell binding (0.41), the Theory→Schema bridge and CLI-integrated REPL (0.42), the dependent-sort surface in `class!` / `inductive!` / `derive_theory!` (0.44), `Theory.from_json` / `from_yaml` / `from_nickel` and `panproto.TheoryBuilder` on the Python SDK (0.44 / 0.45), and the spaCy-style companion grammar packs (0.45).

### Added

- **`skills/companion-grammar-packs`**: new skill covering the ten pip-installable companion wheels (`panproto-grammars-{web,systems,jvm,scripting,data,functional,devops,mobile,music,all}`). Documents the entry-point discovery mechanism, the cross-cdylib FFI transport (raw `*const TSLanguage` pointers cast to integers; trust boundary on `panproto-py`), the per-process leaked-metadata cache, and the `aarch64-unknown-linux-gnu` × `panproto-grammars-all` gap from upstream issue [#85](https://github.com/panproto/panproto/issues/85).
- `skills/sdk-python` now covers `panproto.TheoryBuilder` (fluent theory construction, mirroring `SchemaBuilder` / `MigrationBuilder`), `Theory.from_json` / `from_yaml` / `from_nickel` / `from_path` / `from_dict_json` / `to_json` (the `panproto-theory-dsl` loaders surfaced on the Python SDK in 0.44.0), and the companion-grammar-pack table (0.45.0).
- `skills/typeclasses`: dependent sorts in `class!`, `inductive!`, and `derive_theory!` argument and output positions (0.44.0). Surface grammar `Ident: SortExpr` where `SortExpr := Ident ('(' Term,* ')')?`. Includes a worked STLC example whose argument and output sorts are dependent (`Tm(extend(g, a), b)`, `Tm(g, arrow(a, b))`).
- `skills/full-ast-parsing`: section on `AstParser::emit_pretty`, the generic `grammar.json` walker (0.40.0), and `panproto_parse::parse_emit_lens` packaging the parse / emit pair as an asymmetric `Lens<bytes, schema>`. Documents the `EmitParse` retraction (`check_emit_parse`) and `ParseEmit` stability law (`check_parse_emit`), with the multiset witnesses (`kind_multiset` + `edge_multiset`) and `strip_complement`.
- `skills/sdk-rust`: section on `panproto_schema::Protocol::from_theories` (0.42.0), the bridge from a hand-rolled `Theory` (or theory name) to a `SchemaBuilder` ready for `Repository::add` and `parse_with_protocol`. Same surface is reachable as `panproto.Protocol.from_theories` from Python.
- `skills/repl`: `schema theory repl` (0.42.0+) integration. The standalone `panproto-repl` binary was removed; the engine is now consumed by `panproto-cli` through a shared rustyline driver also used by `schema expr repl`. Syntax highlighting, persistent history, and tab-completion of `:command` names behave identically across both REPL surfaces.

### Changed

- `mcp-server`: `@panproto/core` dependency bumped from `^0.39.0` to `^0.45.0`. Server version bumped from `0.12.1` to `0.13.0`.
- `templates/python-project`: `panproto>=0.39.0` → `panproto>=0.45.0`.
- `templates/ts-project`: `@panproto/core ^0.39.0` → `^0.45.0`.
- `templates/rust-project`: `panproto-core 0.39.0` → `0.45.0`.
- `mcp-server/README.md`: tool-description accuracy line bumped to 0.45.0; explicit note that the `class` / `inductive` / `derive_theory` surface accepts dependent sorts as of 0.44.0 and that `panproto.TheoryBuilder` plus `Theory.from_json` / `from_yaml` / `from_nickel` are the Python-side equivalents.
- `README.md`: header bumped to "Written for panproto v0.45.0".

### Deferred

- A standalone `skills/parse-emit-lens` skill is left for a future release; the `full-ast-parsing` skill subsumes it well enough at the current depth, and a dedicated skill would duplicate content. Will revisit if the `ParseEmitLens` surface grows.
- `skills/haskell-binding` (panproto 0.41.0's `panproto-c` + cabal package) is not added in this release. The Haskell binding's audience is small relative to the existing skills; the v0.41.0 bluesky thread covers the launch and the panproto repo's `bindings/haskell/README.md` is the authoritative consumer reference. Will add a skill if downstream Haskell users surface concrete tooling needs.
- No new MCP tool wraps `panproto.Protocol.from_theories` directly; the existing `panproto_theory_compile` covers the `protocol` document body which is the analogous CLI-side path. A dedicated `panproto_protocol_from_theories` would be useful but waits for downstream demand.

## [0.12.1] - 2026-04-25

Updated for panproto v0.39.0 (lexicon-only release surfacing features that accumulated since 0.36: Merkle-tree per-file schema content addressing, the full 14-strategy alignment ladder, sample-based coercion-law verification with `FilterOptions`, and richer commit records).

### Changed
- `skills/coercion-law-checks`: corrected the `AutoLensConfig` example. `FilterOptions` has a single field, `unknown: UnknownSamplesPolicy`, with variants `Keep` (default, pre-0.38 behavior) and `Drop` (strictest filter). The earlier writeup invented `unknown_samples_policy: Reject` and a non-existent `unknown_witness_policy`. Added a section on the new `dev.panproto.translate.verifyCoercionLaws` procedure lexicon, which exposes the same checker to non-Rust toolchains.
- `skills/build-migration`: documented the 14-strategy alignment ladder (`user_hint`, `exact`, `exact_suffix`, `edge_label`, `alias`, `token_similarity`, `description_similarity`, `type_signature`, `wrap_unwrap`, `coerce`, `neighborhood`, `wl_refinement`, `structural`, `llm`) and the `alignmentStrategies` summary on the migration record. Cross-referenced `verifyCoercionLaws` for service-mediated callers.
- `skills/schema-vcs`: rewrote the core-concepts list to describe the `SchemaTreeObject` Merkle tree (`SingleLeaf` and `Directory`), `FileSchemaObject` with `cross_file_edges`, and `resolve_commit_schema`. Listed every commit-record field added through 0.39.0 (`protocolHash`, `theoryIds`, `dataHashes`, `complementHashes`, `editLogHashes`, `cstComplementHashes`, `timestamp`) and the new first-class object kinds (`fileSchema`, `schemaTree`, `flatSchema`, `dataSet`, `editLog`, `cstComplement`, `tag`).
- `agents/migration-advisor`: replaced the 6-strategy section with the 14-strategy ladder, tier gating, and the `alignmentStrategies` summary readout. Added the `FilterOptions::with_unknown(UnknownSamplesPolicy::Drop)` recommendation for the strictest coerce-anchor gate, plus the `verifyCoercionLaws` lexicon for non-Rust callers.
- `agents/vcs-assistant`: added a 0.38 / 0.39 notes section covering the per-file Merkle tree, the richer commit record, and the new content-addressed object kinds. Pointers to `panproto_vcs::resolve_commit_schema`, `dev.panproto.node.getFileSchema`, `dev.panproto.node.getSchemaTree`, `dev.panproto.node.listTheories`, `dev.panproto.node.listAlignments`.
- `agents/compatibility-checker`: added a 0.39 notes section recording that the 14-strategy ladder is now wire-canonical via `alignmentStrategies` and that `verifyCoercionLaws` is available for non-Rust callers.
- `mcp-server/src/tools/lens.ts`: `panproto_lens_generate` description names all 14 alignment strategies and the new `alignmentStrategies` summary field.
- `mcp-server/src/tools/migration.ts`: `panproto_auto_migrate` description names all 14 alignment strategies.
- `mcp-server/src/tools/vcs.ts`: `panproto_vcs_log` and `panproto_vcs_diff` descriptions reference the new commit-record fields and the per-file Merkle-tree resolution.

### Not yet wrapped
- No MCP tool wraps `dev.panproto.translate.verifyCoercionLaws` directly; callers wanting the procedure-style entry point should hit the lexicon endpoint on a panproto node, or use the existing `panproto_theory_check_coercion_laws` tool which wraps the CLI verb against a theory file.
- No MCP tool walks the `SchemaTreeObject` directly; `panproto_vcs_*` tools delegate to the CLI which resolves commits transparently. A dedicated `panproto_vcs_show_object` would be useful for object-level inspection.

## [0.12.0] - 2026-04-24

Updated for panproto v0.38.0 (sample-based coercion law verification; naturality-aware span exclusion in auto-lens).

### Added
- **skills/coercion-law-checks**: new skill covering the `schema theory check-coercion-laws` CLI verb, `CoercionClass` semantics (`Iso`, `Retraction`, `Projection`, `Opaque`), the `CoercionLawViolation` kinds (`Backward`, `Forward`, `NonDeterministic`, `MissingInverse`, `ForwardEvalError`, `InverseEvalError`, `UnknownClass`), sample-registry customization via `CoercionSampleRegistry::with_defaults`, DSL-side compile-time law checks via `compile_theory_with_law_check`, the opt-in `AutoLensConfig.coercion_law_registry` auto-lens filter, and a GitHub Actions workflow for CI integration.
- **mcp-server**: new `panproto_theory_check_coercion_laws` tool wrapping the 0.38.0 CLI verb; supports `--var-name` and `--json` flags.

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.38.0`; server version bumped to 0.12.0.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.38.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.38.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.38.0`.
- `skills/use-lenses`: cross-reference to the new coercion-law-checks skill, `AutoLensConfig.coercion_law_registry`, and naturality-aware span exclusion at `Lenient+`.
- `skills/protolenses`: new section on naturality-aware span exclusion; noted that empty-candidate failures on sparse-overlap pairs may now succeed on 0.38 without additional hints. Fixes panproto/panproto#51.
- `skills/build-migration`: new subsection on declaring `Iso` / `Retraction` honestly and running the law check before shipping a migration.
- `agents/migration-advisor`: recommend running `check-coercion-laws` before migration synthesis; note naturality-aware span exclusion reduces spurious empty-candidate failures.
- `agents/schema-reviewer`: recommend enabling `AutoLensConfig.coercion_law_registry` for schema reviews where coerce anchors appear.
- `agents/compatibility-checker`: coercion-law violations documented as a new class of check distinct from structural compatibility.

## [0.11.0] - 2026-04-23

Updated for panproto v0.37.0 (implicit arguments, closed sorts plus `Term::Case`, typed holes, let bindings, rewriting module with Knuth-Bendix and LPO, class / instance / inductive DSL bodies, theory imports, span-aware errors, six new alignment strategies, new `panproto-gat-macros` and `panproto-repl` crates).

### Added
- **skills/typeclasses**: classes and instances as theories and theory morphisms; DSL body types and the `class!`/`instance!`/`derive_theory!` proc-macros from `panproto-gat-macros`.
- **skills/rewriting**: directed equations, `check_local_confluence`, `check_termination_via_lpo`, `alpha_eq_modulo_rewrites`, and `typecheck_equation_modulo_rewrites`.
- **skills/implicit-arguments**: `Implicit::Yes` tag, Robinson unification recovery at call sites, `ParamSpec.implicit`, and guidance for when to mark a parameter implicit.
- **skills/closed-sorts-and-case**: `SortClosure::Closed(ops)`, `Term::Case`, coverage and branch-consistency checks, and the Stan-emitter-as-total-function example.
- **skills/repl**: quickstart for the `panproto-repl` binary with the full command reference.

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.37.0`; server version bumped to 0.11.0.
- `mcp-server`: `panproto_theory_validate` and `panproto_theory_compile` tool descriptions now mention the new class / instance / inductive body types and the implicit-argument, closed-sort, let-binding, and definitional-equality-modulo-rewrites features.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.37.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.37.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.37.0`.
- `skills/build-protocol`: new section documenting the 0.37.0 DSL body types (`class`, `instance`, `inductive`, `composition`, `protocol`), `TheorySpec.imports`, `ParamSpec.implicit`, and `SortSpec.closed`.
- `agents/migration-advisor`: new section on the six alignment strategies added in `panproto-mig` (`edge_label_anchors`, `suffix_anchors`, `description_anchors`, `neighborhood_anchors`, `wl_anchors`, `embedding_anchors`) and the `adjust_anchors_by_required_sets` post-processing tiebreak.
- `agents/compatibility-checker`: notes tightened `kinds_and_constraints_compatible` semantics (format-aware) and new alignment strategies.
- `agents/schema-reviewer`: notes morphism checks now honor alpha-renaming and preserve `SortClosure`, and recommends explicit `format` constraints for fields whose compatibility depends on them.

### Not yet wrapped
- No CLI verbs exist in `panproto-cli` for confluence, termination, or class / instance listing; consumers should call the library APIs (`panproto_gat::rewriting`) directly until those verbs land.

## [0.9.0] - 2026-04-20

Updated for panproto v0.35.0 (atproto `format`/`knownValues` fidelity in `parse_lexicon`; workspace-wide real-fixture examples and benches).

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.35.0`; server version bumped to 0.9.0.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.35.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.35.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.35.0`.

Downstream consumers using `@panproto/core` to parse AT Proto Lexicons now receive `format` (`datetime`, `did`, `at-uri`, `cid`, `nsid`, `handle`, `at-identifier`, `tid`, `record-key`, `language`, `uri`) and `knownValues` as structured constraints on the corresponding string vertex. Hand-written lexicon re-parsers that existed solely to recover these fields can be dropped. Resolves panproto/panproto#42.

## [0.8.0] - 2026-04-17

Updated for panproto v0.34.0 (git-remote-panproto rename, warm cache, autolens stringency tiers from v0.33.0).

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.34.0`; server version bumped to 0.8.0.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.34.0`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.34.0`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.34.0`.
- `skills/contributing`: supporting crate renamed from `git-remote-cospan` to `panproto-git-remote`. The old crate is yanked from crates.io; users should `cargo install panproto-git-remote` and use `panproto://` URLs going forward.

### Added
- `skills/use-lenses`: new sections covering the `Stringency` axis (`strict`/`balanced`/`lenient`/`exploratory`), the candidates API (`auto_generate_candidates` / `--top-n` / `--explain`), and sort-coercion witnesses with `CoerceProposal` outputs. Introduced in panproto v0.33.0.
- `mcp-server`: `panproto_lens_generate` tool gains `stringency`, `top_n`, and `explain` parameters matching the CLI flags.

## [0.7.1] - 2026-04-14

Updated for panproto v0.30.1 (WASM packaging fix; Node.js support for `@panproto/core`).

### Changed
- `mcp-server`: `@panproto/core` dependency bumped to `^0.30.1`; server version bumped to 0.7.1.
- `templates/ts-project`: `@panproto/core` dependency bumped to `^0.30.1`.
- `templates/rust-project`: `panproto-core` dependency bumped to `0.30.1`.
- `templates/python-project`: `panproto` dependency bumped to `>=0.30.1`.

Users following the templates now pick up the fixed `@panproto/core` npm package
that actually includes the WASM binary. See panproto/panproto#33.

## [0.7.0] - 2026-04-13

Updated for panproto v0.29.0 (polymorphic query engine, git-remote-cospan distribution).

### Changed
- All version references updated to panproto 0.29.0
- MCP server version bumped to 0.7.0
- `@panproto/core` dependency updated to `^0.29.0`
- Template project dependencies updated to panproto 0.29.0

## [0.6.0] - 2026-04-06

Updated for panproto v0.27.0 (declarative theory definitions).

### Added
- **MCP server**: new `panproto_theory_validate`, `panproto_theory_compile`, `panproto_theory_compile_dir`, `panproto_theory_check_morphism`, `panproto_theory_recompose` tools wrapping `schema theory` CLI subcommands
- **skills/build-protocol**: new "Declarative theory definitions (0.27.0+)" section showing YAML and Nickel theory authoring, bundle format, and CLI usage

### Changed
- All version references updated to panproto 0.27.0
- MCP server version bumped to 0.6.0 (package) / 0.5.0 (McpServer)
- `@panproto/core` dependency updated to `^0.27.0`
- Template project dependencies updated to panproto 0.27.0
- **skills/sdk-rust**: crate version examples updated to 0.27

## [0.5.0] - 2026-04-02

Updated for panproto v0.26.0 (hint-guided auto-lens generation).

### Added
- **skills/use-lenses**: new "Hint-guided generation" section with `HintSpec` format, CLI `--hints` flag, and SDK examples
- **skills/lens-dsl**: new "HintSpec for guided auto-generation" section with JSON/Nickel examples, constraint types, and anchor propagation docs
- **MCP server**: `panproto_lens_generate` tool now supports `hints` parameter for guided auto-lens generation

### Changed
- All version references updated to panproto 0.26.0
- MCP server version bumped to 0.5.0
- `@panproto/core` dependency updated to `^0.26.0`
- **skills/sdk-rust**: added `auto_generate_with_hints()`, `HintParts`, `resolve_hints()`, `DomainConstraints`, `find_morphisms_constrained()`, `find_best_morphism_constrained()`
- **skills/sdk-python**: added `ProtolensChain.auto_generate_with_hints()` and `auto_generate_with_hint_spec()`
- **skills/sdk-typescript**: added hint-guided `protolensChainWithHints()` example
- **skills/protolenses**: added `--hints` CLI flag to automatic generation section
- **skills/build-migration**: replaced `--hint` string flag with `--hints <path>` JSON file approach

## [0.4.1] - 2026-04-02

Fix Rust API inaccuracies across skill files and update crate count.

### Fixed
- **skills/sdk-rust**: corrected function signatures for `auto_generate` (4 args), `colimit` (4 args), `check_morphism` (3 args), `typecheck_term` (3 args), `free_model` (2 args), `check_existence` (5 args), `lift_wtype` (arg order), `find_morphisms` (3 args), `parse_json` (3 args), `check_laws` (returns `Result`), `validate`/`normalize` (free functions), IO registry methods (`parse_wtype`/`emit_wtype`), VCS `init`/`commit` signatures, `report_text` (free function), error example variant, and `openapi` module path
- **skills/build-migration**: corrected `auto_generate` args and `lift_wtype` arg order
- **skills/build-protocol**: corrected `colimit` to `colimit_by_name` with correct 3-arg signature
- **skills/convert-data**: fixed invalid protocol paths and IO registry usage
- **skills/dependent-optics**: fixed `TheoryTransform` import path, `Sort` construction, `ValueKind::Float`
- **skills/field-transforms**: fixed two-step expr parsing, `ComputeField.target_key`, replaced nonexistent `CoerceType` with `ApplyExpr`
- **skills/protolenses**: corrected `auto_generate` args
- **skills/use-lenses**: corrected `auto_generate` args
- **skills/query-instances**: fixed two-step expr parsing, removed nonexistent `query` function
- **skills/contributing**: corrected crate count from 27 to 24, added missing `panproto-lens-dsl` to architecture diagram

## [0.4.0] - 2026-04-01

Updated for panproto v0.25.0 (declarative lens DSL with Nickel composition).

### Added
- **skills/lens-dsl**: new skill for writing declarative lens specifications in Nickel, JSON, or YAML using the `panproto-lens-dsl` crate (0.25.0+)

### Changed
- All version references updated to panproto 0.25.0
- MCP server version bumped to 0.4.0
- `@panproto/core` dependency updated to `^0.25.0`
- **skills/use-lenses**: added section on declarative lens files with Nickel example
- **skills/protolenses**: added section on declarative protolens specifications
- **agents/migration-advisor**: now recommends declarative lens files for version-controlled combinator chains

## [0.3.0] - 2026-04-01

Updated for panproto v0.24.0 (unified tree-sitter parsing, dependent optics).

### Added
- **skills/dependent-optics**: new skill for dependent optics, scoped transforms, and combinators (0.23.0+)
- **skills/format-preserving**: new skill for format-preserving parsing via UnifiedCodec and CstComplement (0.24.0+)
- **MCP server**: `panproto_lens_pipeline` tool for building combinator pipelines with scoped transforms
- **MCP server**: `panproto_parse_preserving` tool for format-preserving parsing with CST complement
- **MCP server**: `panproto_emit_preserving` tool for format-preserving emission from CST complement

### Changed
- All version references updated to panproto 0.24.0
- MCP server version bumped to 0.3.0
- `@panproto/core` dependency updated to `^0.24.0`
- Rust template updated with `tree-sitter` feature option
- **agents/data-converter**: now recommends format-preserving conversion when available
- **agents/migration-advisor**: now recommends dependent optics for array element transforms and `RenameEdgeName` for property key renames
- **resources/codecs**: documents UnifiedCodec and legacy codec deprecation

## [0.2.0] - 2026-03-31

Updated for panproto v0.23.0 (dependent optics, lens combinators, WASM/TS/Python pipeline APIs).

## [0.1.0] - 2026-03-31

Initial release of panproto-toolkit, written for panproto v0.22.1.

### Skills (21)
- **getting-started**: scaffold a new panproto project (TypeScript, Python, or Rust)
- **define-schema**: define schemas with protocol-specific guidance
- **build-migration**: build migrations with existence checking and compilation
- **use-lenses**: bidirectional lenses with get/put, complements, and auto-generation
- **protolenses**: schema-parameterized lens families and chains
- **breaking-change-ci**: breaking change detection and CI gates
- **convert-data**: convert data between any of 50 protocols
- **cross-protocol**: cross-protocol translation with loss analysis
- **schema-vcs**: schema version control with pushout-based merge
- **query-instances**: query instances with predicates and projections
- **expression-language**: reference for the ~50-builtin expression language
- **build-protocol**: define custom protocols by composing building-block theories
- **field-transforms**: value-dependent transforms during migration
- **full-ast-parsing**: parse 248 languages via tree-sitter
- **sdk-typescript**: complete @panproto/core TypeScript SDK guide
- **sdk-python**: complete panproto Python SDK guide
- **sdk-rust**: complete panproto-core Rust library guide
- **contributing**: contributor onramp
- **ci-github-actions**: GitHub Actions workflow generator
- **ci-pre-commit**: pre-commit hook setup
- **ci-breaking-gate**: PR gate for breaking schema changes

### Agents (5)
- **migration-advisor** (Opus): migration strategy analysis
- **compatibility-checker** (Sonnet): cross-protocol compatibility
- **data-converter** (Sonnet): format conversion with fidelity reporting
- **schema-reviewer** (Opus): schema quality review
- **vcs-assistant** (Sonnet): VCS workflow guidance

### MCP Server
- 18 tools across schema, migration, diff, lens, convert, parse, expr, and VCS
- 3 resources: protocols, codecs, grammars catalogs
- 3 prompt templates: migration-plan, schema-review, compatibility-report
- Published as `@panproto/mcp-server` on npm

### Templates
- TypeScript, Python, and Rust project scaffolds
- GitHub Actions workflow templates (schema-check, breaking-change-gate, data-migration)

### Documentation
- Installation guide, skills guide, agents guide, MCP server guide
- Tutorial chapter mapping for all skills
- 4 worked examples (ATProto migration, SQL-to-GraphQL, CI pipeline, lens round-trip)
