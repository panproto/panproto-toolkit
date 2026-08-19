---
name: getting-started
description: >
  Scaffold a new panproto project. Detects your language (TypeScript, Python, or Rust),
  installs dependencies, creates a panproto.toml manifest, generates a starter schema,
  and initializes version control. Use /getting-started or /getting-started <lang>.
argument-hint: "<lang: ts|python|rust>"
---

# Getting Started with panproto

You are helping a user set up a new panproto project. The argument specifies the SDK language (ts, python, or rust). If no argument is given, ask which language they prefer.

## Step 1: Check prerequisites

Verify the panproto CLI is installed:
```bash
schema --version
```

If not installed, show installation options:
- macOS: `brew install panproto/tap/schema`
- Linux/macOS: `curl --proto '=https' -LsSf https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh`
- From source: `cargo install panproto-cli`

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

## Step 3: Create panproto.toml manifest

Create `panproto.toml` in the project root. The manifest is a workspace of packages, and each package may pin the protocol its files are parsed under; without a pin, the language is detected per file:

```toml
[workspace]
name = "<project-name>"
exclude = ["target", "node_modules", "__pycache__", "build", "dist", ".git"]

[[package]]
name = "schemas"
path = "schemas"
protocol = "atproto"   # or openapi, avro, protobuf, sql, graphql, json-schema, ...
```

`[workspace]` is required: a manifest without it is rejected as malformed rather than falling back to a default. A manifest-backed directory is authoritative about its own protocol wherever a command also takes `--protocol`, so the two must agree.

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

## Next steps

Suggest the user explore:
1. `/panproto-define-schema` to learn schema construction in depth
2. The [panproto tutorial](https://panproto.dev/tutorial/) starting from Chapter 1
3. `/panproto-build-migration` once they have two schema versions
4. Loading an existing schema document instead of hand-building one. All 54 built-in protocols are loadable in-process, including json-schema, graphql, sql, and protobuf (restored as first-class semantic protocols in 0.61.0). Use `p.parseSchemaDocument('json-schema', doc)` in TypeScript or `panproto.parse_schema_document('json-schema', doc)` in Python to turn a JSON-document schema (JSON Schema, OpenAPI, Avro, ATProto lexicon, ...) into a schema usable as a lens or migration endpoint. Text/IDL protocols (SQL DDL, GraphQL SDL, Protobuf `.proto`, ...) use `p.parseSchemaSource(protocol, source)` / `panproto.parse_schema_source(protocol, source)`.
5. Asking what two schemas share, with `schema auto-migrate old.json new.json` or `p.span(a, b)` (0.71.0+). Unlike lens generation it never refuses: two schemas with nothing in common come back with an empty apex and a coverage of zero rather than an exception, so it is the right first call on an unfamiliar pair.

## A note on the CLI's protocol support

The SDKs reach all 54 built-in protocols. The `schema` CLI's `--protocol` flag resolves `atproto` and nothing else, and exits non-zero naming what is supported on anything else. So a project in another protocol builds, validates, migrates and versions fine through an SDK, and the CLI steps above are the ATProto path.

## Further Reading

- [Tutorial Ch. 1: The Schema Migration Problem](https://panproto.dev/tutorial/chapters/01-the-schema-migration-problem.html)
- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html)
