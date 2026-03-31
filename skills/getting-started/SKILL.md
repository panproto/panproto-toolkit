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

  // Pick a protocol (50 available: atproto, openapi, avro, protobuf, ...)
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
use panproto_core::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let proto = panproto_protocols::atproto::protocol();
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

Create `panproto.toml` in the project root:
```toml
[project]
name = "<project-name>"
version = "0.1.0"
protocol = "atproto"   # or openapi, avro, protobuf, sql, graphql, json-schema, ...

[schemas]
path = "schemas/"       # directory for schema files
```

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

## Further Reading

- [Tutorial Ch. 1: The Schema Migration Problem](https://panproto.dev/tutorial/chapters/01-the-schema-migration-problem.html)
- [Tutorial Ch. 4: Your First Migration](https://panproto.dev/tutorial/chapters/04-your-first-migration.html)
