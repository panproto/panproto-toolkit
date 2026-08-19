---
name: getting-started
description: >
  Scaffold a new panproto project. Detects your language (TypeScript, Python, Rust, or
  Swift), installs dependencies, creates a panproto.toml manifest, generates a starter
  schema, and initializes version control. Use /getting-started or /getting-started <lang>.
argument-hint: "<lang: ts|python|rust|swift>"
---

# Getting Started with panproto

You are helping a user set up a new panproto project. The argument specifies the SDK language (ts, python, rust, or swift). If no argument is given, ask which language they prefer.

A ready-made scaffold for each language sits in `templates/`: `ts-project/`, `python-project/`, `rust-project/`, and `swift-project/`. The steps below reproduce those templates from scratch, so copying the matching directory is the same thing done faster.

## Step 1: Check prerequisites

Verify the panproto CLI is installed:
```bash
schema --version
```

If not installed, show installation options:
- macOS: `brew install panproto/tap/schema`
- Linux/macOS: `curl --proto '=https' -LsSf https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh`
- From source: `cargo install panproto-cli`

For Swift, also check the toolchain: `swift --version`. The SDK's manifest declares `swift-tools-version: 6.1` and uses package traits, so a 6.0 toolchain cannot read it and resolution fails before anything compiles. On Apple platforms that means Xcode 16.3 or later.

## Step 2: Scaffold the project

### TypeScript (`ts`)

1. Initialize the project:
```bash
mkdir <project-name> && cd <project-name>
npm init -y
npm install @panproto/core
npm install -D typescript @types/node
npx tsc --init --strict --target ES2023 --module nodenext --moduleResolution nodenext
```

2. Create `src/index.ts`:
```typescript
import { Panproto } from '@panproto/core';

async function main() {
  const p = await Panproto.init();

  // Pick a protocol (54 available: atproto, openapi, avro, protobuf, ...)
  const proto = p.protocol('atproto');

  // Define a schema
  const schema = proto.schema()
    .vertex('post', 'record', { nsid: 'app.bsky.feed.post' })
    .vertex('post:body', 'object')
    .vertex('post:body.text', 'string')
    .edge('post', 'post:body', 'record-schema')
    .edge('post:body', 'post:body.text', 'prop', { name: 'text' })
    .constraint('post:body.text', 'maxLength', '3000')
    .build();

  console.log('Schema built successfully');
}

main();
```

### Python (`python`)

1. Initialize the project:
```bash
mkdir <project-name> && cd <project-name>
python -m venv .venv && source .venv/bin/activate
pip install panproto
```

2. Create `src/main.py`:
```python
import panproto

proto = panproto.get_builtin_protocol("atproto")

builder = proto.schema()
builder.vertex("post", "record", "app.bsky.feed.post")
builder.vertex("post:body", "object")
builder.vertex("post:body.text", "string")
builder.edge("post", "post:body", "record-schema")
builder.edge("post:body", "post:body.text", "prop", "text")
builder.constraint("post:body.text", "maxLength", "3000")
schema = builder.build()

print("Schema built successfully")
```

### Rust (`rust`)

1. Initialize the project:
```bash
cargo init <project-name>
cd <project-name>
cargo add panproto-core
```

2. Replace `src/main.rs`:
```rust
use panproto_core::{protocols, schema};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let proto = protocols::atproto::protocol();
    let schema = schema::SchemaBuilder::new(&proto)
        .vertex("post", "record", Some("app.bsky.feed.post"))?
        .vertex("post:body", "object", None)?
        .vertex("post:body.text", "string", None)?
        .edge("post", "post:body", "record-schema", None)?
        .edge("post:body", "post:body.text", "prop", Some("text"))?
        .constraint("post:body.text", "maxLength", "3000")
        .build()?;

    println!("Schema built successfully");
    Ok(())
}
```

### Swift (`swift`)

1. Initialize the package and add the dependency:
```bash
mkdir <project-name> && cd <project-name>
swift package init --type executable --name MyPanprotoApp
swift package add-dependency https://github.com/panproto/panproto-swift.git --up-to-next-minor-from 0.71.0
swift package add-target-dependency Panproto MyPanprotoApp --package panproto-swift
swift package add-target-dependency PanprotoStructural MyPanprotoApp --package panproto-swift
```

`--up-to-next-minor-from` rather than `--from`: panproto is pre-1.0 and breaks its API across minors, and each tag's manifest pins its own XCFramework, so the wider range would move the Swift surface and the engine under the project at once. The flag writes the range longhand, `"0.71.0" ..< "0.72.0"`, not `.upToNextMinor(from:)`.

The SDK lives at `bindings/swift` inside the panproto repository, and SwiftPM resolves a package URL by cloning and looking for a `Package.swift` at the root, with no subpath option. Each release therefore mirrors that directory to [`panproto/panproto-swift`](https://github.com/panproto/panproto-swift) under the same tag, and that mirror is the URL above. Its manifest pins the `panproto_c.xcframework` published for its own tag, so resolving the dependency also downloads the prebuilt C library: no Rust toolchain, no workspace checkout, nothing to stage by hand.

Two products are enough for a starter. `Panproto` is the engine-backed core, and `PanprotoStructural` is the pure value layer it hands back and takes (`Schema`, `Vertex`, `Edge`, `SchemaSpan`). `PanprotoVcs` carries schematic version control, and `PanprotoParse`, `PanprotoProject`, and `PanprotoGit` are gated behind the package traits `PANPROTO_PARSE`, `PANPROTO_PROJECT`, and `PANPROTO_GIT`, which is not how the products are spelled. All six products always exist in the package graph, so a build that ignores the gated three still resolves; their modules are simply empty unless the build both names the trait and links a `libpanproto_c` compiled with the matching cargo feature. The XCFramework each release pins is the default build, which has none of the three, so a project on the published dependency can use `Panproto`, `PanprotoStructural`, and `PanprotoVcs`, and reaching the other three means building the C library from a panproto checkout.

The `package:` argument in each `add-target-dependency` above is SwiftPM's package *identity*, which it takes from the last component of the URL. It is `panproto-swift`, and the mirrored manifest still calls itself `panproto`, so hand-editing it to the manifest's own name gets `unknown package 'panproto' in dependencies of target 'MyPanprotoApp'; valid packages are: 'panproto-swift'`.

2. Add the platform floor `swift package init` leaves out. The SDK declares macOS 14 and iOS 17, so edit `Package.swift`:
```swift
let package = Package(
    name: "MyPanprotoApp",
    platforms: [.macOS(.v14), .iOS(.v17)],
    // ... dependencies and targets as the four commands above wrote them
)
```

Skipping this is the first thing that goes wrong. Resolution succeeds and the build then stops at `the executable 'MyPanprotoApp' requires macos 10.13, but depends on the product 'Panproto' which requires macos 14.0`.

Nothing else in the generated manifest needs touching. In particular there is no `swiftLanguageModes:` line to add: a manifest at tools-version 6.1 or later already compiles in Swift 6 language mode, which is the mode `@PanprotoEngine` isolation is enforced under.

3. Replace `Sources/MyPanprotoApp/MyPanprotoApp.swift`:
```swift
import Foundation
import Panproto
import PanprotoStructural

@main
struct MyPanprotoApp {
    static func main() async throws {
        // Every engine call is isolated to the `@PanprotoEngine` global
        // actor, which is pinned to one thread. `run` isolates a whole
        // region at once, so the handles below never cross a suspension.
        try await PanprotoEngine.run {
            // Pick a protocol (54 available: atproto, openapi, avro, protobuf, ...)
            let atproto = try ProtocolHandle.builtin("atproto")
            defer { atproto.release() }

            // Define a schema. ATProto has no `datetime` vertex kind: a
            // timestamp is a `string` carrying the `format` constraint.
            let v1 = try SchemaBuilder(over: atproto) {
                Vertex(id: "post", kind: "record", nsid: "app.bsky.feed.post")
                Vertex(id: "post:body", kind: "object")
                Vertex(id: "post:body.text", kind: "string")
                Vertex(id: "post:body.createdAt", kind: "string")
                Edge(src: "post", tgt: "post:body", kind: "record-schema")
                Edge(src: "post:body", tgt: "post:body.text", kind: "prop", name: "text")
                Edge(src: "post:body", tgt: "post:body.createdAt", kind: "prop", name: "createdAt")
                VertexConstraint(sort: "maxLength", value: "3000", on: "post:body.text")
                VertexConstraint(sort: "format", value: "datetime", on: "post:body.createdAt")
                Entry("post")
            }
            .build()
            defer { v1.release() }

            print("Schema built successfully")
        }
    }
}
```

Keep the `@main` type `swift package init` generated rather than renaming the file to `main.swift`: `@main` is rejected in a file by that name. Top-level code in a `main.swift` takes `try await` too, so either shape runs the pipeline; this one is just what the generator wrote.

`SchemaBuilder(over:_:)` is the declarative spelling; the imperative `builder.vertex(_:kind:nsid:)` and `builder.edge(from:to:kind:name:)` record the same steps, and a schema that fails one fails the other for the same reason. Nothing inside the body can fail, so the engine reports a bad vertex kind or an ill-typed edge from `build()` rather than from the line that wrote it.

Every engine call is isolated to `@PanprotoEngine`, which is a global actor pinned to one thread because panproto-c keeps its last-error slot in thread-local storage. Reached from outside, each call is `async` and needs its own `await`; `PanprotoEngine.run` isolates a region instead, so the calls inside are ordinary synchronous ones and no handle crosses a suspension. Both spellings appear in the SDK's own documentation, and the region form is the one worth starting from.

`templates/swift-project/` carries a longer version of this file that goes on to build a second version of the schema and span the two, which is item 5 under "Next steps" below.

## Step 3: Create panproto.toml manifest

Create `panproto.toml` in the project root. The manifest is a workspace of packages, and each package may pin the protocol its files are parsed under; without a pin, the language is detected per file:

```toml
[workspace]
name = "<project-name>"
exclude = ["target", "node_modules", "__pycache__", "build", "dist", "**/Pods", "**/DerivedData"]

[[package]]
name = "schemas"
path = "schemas"
protocol = "atproto"   # or openapi, avro, protobuf, sql, graphql, json-schema, ...
```

`[workspace]` is required: a manifest without it is rejected as malformed rather than falling back to a default. A manifest-backed directory is authoritative about its own protocol wherever a command also takes `--protocol`, so the two must agree.

Two things about `exclude` are worth knowing before you write a list that does nothing. The globs are resolved against the workspace root, so a bare `Pods` skips `./Pods` and walks straight into `schemas/Pods`; write `**/Pods` to catch it anywhere. And a name beginning with a dot is skipped before the list is consulted, so `.git`, `.build`, and `.swiftpm` are already handled and entries for them are inert.

## Step 4: Initialize schema version control

```bash
schema init
```

This creates a `.panproto/` directory (similar to `.git/`) for content-addressed schema storage.

## Step 5: First commit

```bash
# Stage and commit the starter schema
schema add schemas/
schema commit -m "initial schema"
```

`schema add` takes a single schema file or a directory. A directory goes in through the per-file project path, so each file keeps its own object and a later one-file edit reuses every unchanged sibling's object rather than realigning the whole schema. That path covers parsed source projects and manifest-declared bundle protocols, including ATProto lexicon sets with cross-file references. Python reaches the same path as `repo.add_project(project, skip_verify=False)`.

Three flags are worth knowing early:

```bash
schema add schemas/ --dry-run          # show what would be staged
schema add schemas/ --data records/    # stage JSON data files alongside the schema
schema add schemas/ --skip-verify      # record the migration, skip the model check
```

`--skip-verify` matters when you are replaying already-validated history: staging runs a bounded model check against HEAD on every schema, and on an 800-vertex schema that costs minutes per `add`. With the flag set the migration is still derived and recorded, the stage is left pending, and a default `commit` treats pending as non-blocking. `commit --skip-verify` is the matching escape hatch for equation verification.

Staged data is stored opaquely against a `schema_id`: it is not parsed or checked against the schema it is recorded under, so a file whose shape has nothing to do with the schema is accepted and committed.

## Step 6: Verify

Run the starter code to confirm everything works:
- TypeScript: `npx tsx src/index.ts`
- Python: `python src/main.py`
- Rust: `cargo run`
- Swift: `swift run`

The first Swift build downloads the XCFramework the manifest pins, which is 356 MB at 0.71.0, so it takes far longer than the ones after it; SwiftPM caches it per checkout. The XCFramework carries static archives, so the binary links `libpanproto_c` in and runs with nothing on `DYLD_LIBRARY_PATH`. A checkout that builds the SDK from source through `bootstrap/dev-link.sh` links the dylib instead and does need the staged directory on the loader path.

## Next steps

Suggest the user explore:
1. `/panproto-define-schema` to learn schema construction in depth
2. The [panproto tutorial](https://panproto.dev/tutorial/) starting from Chapter 1
3. `/panproto-build-migration` once they have two schema versions
4. Loading an existing schema document instead of hand-building one. All 54 built-in protocols are loadable in-process, including json-schema, graphql, sql, and protobuf (restored as first-class semantic protocols in 0.61.0). Use `p.parseSchemaDocument('json-schema', doc)` in TypeScript or `panproto.parse_schema_document('json-schema', doc)` in Python to turn a JSON-document schema (JSON Schema, OpenAPI, Avro, ATProto lexicon, ...) into a schema usable as a lens or migration endpoint. Text/IDL protocols (SQL DDL, GraphQL SDL, Protobuf `.proto`, ...) use `p.parseSchemaSource(protocol, source)` / `panproto.parse_schema_source(protocol, source)`. Swift is the exception. The C ABI exposes one schema-document parser, `pp_schema_parse_atproto_lexicon`, so `SchemaHandle.parseAtprotoLexicon(_:)` is the only document route the SDK has. Every other protocol is reached either by building the schema with `SchemaBuilder`, or by handing `SchemaHandle.define(_:)` a `Schema` value decoded from CBOR another panproto consumer wrote.
5. Asking what two schemas share, with `schema auto-migrate old.json new.json`, `p.span(a, b)` (0.71.0+), or `try await v1.findSpan(to: v2, in: atproto)` in Swift. Unlike lens generation it never refuses: two schemas with nothing in common come back with an empty apex and a coverage of zero rather than an exception, so it is the right first call on an unfamiliar pair. Read `apexCoverage` alongside the score, and pass `MorphismSearchOptions(monic: true)` when a coverage of 1.0 should mean "nothing was dropped" rather than "everything found somewhere to go": the default search may send two source vertices to one target.

## A note on the CLI's protocol support

The SDKs reach all 54 built-in protocols. The `schema` CLI's `--protocol` flag resolves `atproto` and nothing else, and exits non-zero naming what is supported on anything else. So a project in another protocol builds, validates, migrates and versions fine through an SDK, and the CLI steps above are the ATProto path.

## Further Reading

- [Tutorial Ch. 1: The Schema Migration Problem](https://panproto.dev/tutorial/chapters/01-the-schema-migration-problem.html)
- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html)
