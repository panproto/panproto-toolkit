---
name: build-protocol
description: >
  Build a custom protocol definition by composing building-block theories via colimit.
  Use /build-protocol to define a new schema language for panproto.
---

# Building a Custom Protocol

You are helping a user define a new protocol for panproto. A protocol is a pair of GATs (Generalized Algebraic Theories): one defining what schemas look like, one defining what instances look like. All 51 built-in protocols are composed from a small set of reusable building-block theories.

## Core concepts

A protocol = (Schema Theory, Instance Theory).

- **Schema Theory** defines the valid vertex kinds, edge kinds, and constraints
- **Instance Theory** defines how data lives over schemas (tree-shaped, relational, or graph)

Both are composed from building blocks using `colimit` (categorical pushout).

## Step 1: Choose building blocks

### Schema theory building blocks

| Theory | What it adds | Use when |
|--------|-------------|----------|
| `ThGraph` | Vertices + edges (src/tgt) | Always (base for all protocols) |
| `ThConstraint` | Constraints (minLength, maxLength, enum, pattern, required) | Format has validation rules |
| `ThMulti` | Parallel edges between same endpoints | Format allows multiple relationships |
| `ThHypergraph` | Hyperedges (fan-in/fan-out) | Format has n-ary relationships |
| `ThMeta` | Names + documentation | Format has names/descriptions |
| `ThImport` | Cross-file imports | Format supports multi-file schemas |

### Instance theory building blocks

| Theory | What it adds | Use when |
|--------|-------------|----------|
| `ThWType` | W-types (tree-structured instances) | JSON, XML, ATProto, Avro |
| `ThFunctor` | Set-valued functors (relational tables) | SQL, CSV, Parquet |
| `ThFlat` | Flat records (no nesting) | Simple key-value formats |

## Step 2: Compose via colimit

**CLI (via the expression language):**
```bash
schema expr eval '
  let graph = ThGraph
      constraints = ThConstraint
      meta = ThMeta
      schemaTheory = colimit [graph, constraints, meta]
      instanceTheory = ThWType
  in defineProtocol "my-format" schemaTheory instanceTheory
'
```

**TypeScript:**
```typescript
const schemaTheory = p.colimitTheories([
  p.builtinTheory('ThGraph'),
  p.builtinTheory('ThConstraint'),
  p.builtinTheory('ThMeta'),
]);

const instanceTheory = p.builtinTheory('ThWType');

const proto = p.defineProtocol('my-format', schemaTheory, instanceTheory);
```

**Python:**
```python
schema_theory = panproto.colimit([
    panproto.builtin_theory("ThGraph"),
    panproto.builtin_theory("ThConstraint"),
    panproto.builtin_theory("ThMeta"),
])

instance_theory = panproto.builtin_theory("ThWType")

proto = panproto.define_protocol("my-format", schema_theory, instance_theory)
```

**Rust:**
```rust
use panproto_gat::colimit_by_name;
use panproto_protocols::theories::*;

// colimit_by_name identifies shared sorts/ops by name.
// The third argument is the shared sub-theory common to both.
let graph = th_graph();
let step1 = colimit_by_name(&graph, &th_constraint(), &graph)?;
let schema_theory = colimit_by_name(&step1, &th_meta(), &graph)?;
let instance_theory = th_wtype();

let proto = Protocol::new("my-format", schema_theory, instance_theory);
```

## Step 3: Define vertex and edge kinds

After composing the theory, register the specific vertex and edge kinds your format uses:

```typescript
const proto = p.defineProtocol('my-format', schemaTheory, instanceTheory, {
  vertexKinds: [
    { name: 'document', sort: 'Vertex' },
    { name: 'section', sort: 'Vertex' },
    { name: 'field', sort: 'Vertex' },
    { name: 'string', sort: 'Vertex' },
    { name: 'number', sort: 'Vertex' },
  ],
  edgeKinds: [
    { name: 'contains', sort: 'Edge', srcKinds: ['document', 'section'], tgtKinds: ['section', 'field'] },
    { name: 'type-of', sort: 'Edge', srcKinds: ['field'], tgtKinds: ['string', 'number'] },
  ],
});
```

## Step 4: Build schemas with the custom protocol

```typescript
const schema = proto.schema()
  .vertex('root', 'document')
  .vertex('header', 'section')
  .vertex('title', 'field')
  .vertex('title-type', 'string')
  .edge('root', 'header', 'contains')
  .edge('header', 'title', 'contains')
  .edge('title', 'title-type', 'type-of')
  .constraint('title-type', 'maxLength', '200')
  .build();
```

## Step 5: Implement a parser (optional)

To parse existing files in your format, implement a parser that produces panproto instances:

```typescript
// Register a parser for your format
p.registerParser('my-format', (data: Uint8Array) => {
  // Parse the raw bytes into your format's structure
  // Return a panproto Instance
  const builder = proto.instanceBuilder(schema);
  // ... populate the instance ...
  return builder.build();
});

// Now you can use it with the I/O system
const instance = p.parseInstance(proto, myFormatData);
```

## Step 6: Test with existing panproto operations

Once defined, your protocol works with all panproto operations:
- Schema building and validation
- Migration between versions
- Lens generation
- Breaking change detection
- Version control
- Cross-protocol translation

```bash
schema validate --protocol my-format schema.json
schema diff --src old.json --tgt new.json
schema lens generate old.json new.json
```

## Example: defining a config file protocol

```typescript
// A simple config file format with sections and key-value pairs
const schemaTheory = p.colimitTheories([
  p.builtinTheory('ThGraph'),
  p.builtinTheory('ThConstraint'),
]);

const proto = p.defineProtocol('config', schemaTheory, p.builtinTheory('ThWType'), {
  vertexKinds: [
    { name: 'config', sort: 'Vertex' },
    { name: 'section', sort: 'Vertex' },
    { name: 'key', sort: 'Vertex' },
    { name: 'string-value', sort: 'Vertex' },
    { name: 'int-value', sort: 'Vertex' },
    { name: 'bool-value', sort: 'Vertex' },
  ],
  edgeKinds: [
    { name: 'has-section', sort: 'Edge', srcKinds: ['config'], tgtKinds: ['section'] },
    { name: 'has-key', sort: 'Edge', srcKinds: ['section'], tgtKinds: ['key'] },
    { name: 'value-type', sort: 'Edge', srcKinds: ['key'], tgtKinds: ['string-value', 'int-value', 'bool-value'] },
  ],
});
```

## Declarative theory definitions (0.27.0+)

Instead of writing Rust/TypeScript/Python, you can define theories, compositions, and protocols as data files using `panproto-theory-dsl`:

**YAML:**
```yaml
id: dev.my-domain.config-protocol
description: Custom config file protocol
bundle: config

theories:
  - theory: ThConfig
    sorts: [{ name: Vertex }, { name: Edge }]
    ops:
      - { name: src, input: Edge, output: Vertex }
      - { name: tgt, input: Edge, output: Vertex }

compositions:
  - result: ThConfigSchema
    bases: [ThConfig, ThConstraint]
    steps:
      - left: ThConfig
        right: ThConstraint
        shared_sorts: [Vertex]

protocols:
  - protocol: config
    schema_theory: ThConfigSchema
    instance_theory: ThWType
    edge_rules:
      - { edge_kind: has-section, src_kind: config, tgt_kind: section }
      - { edge_kind: has-key, src_kind: section, tgt_kind: key }
```

**Nickel:**
```nickel
let T = import "panproto/theory.ncl" in

{
  id = "dev.my-domain.graph-theory",
  description = "Simple directed graph",
  theory = "ThMyGraph",
  sorts = [T.simple "Vertex", T.simple "Edge"],
  ops = [
    T.unary "src" "Edge" "Vertex",
    T.unary "tgt" "Edge" "Vertex",
  ],
} | T.Theory
```

**CLI:**
```bash
schema theory validate my_theory.yaml
schema theory compile my_theory.yaml --json
schema theory compile-dir theories/
```

This approach requires no Rust code, no recompilation, and the resulting theories work with all panproto operations (validation, migration, lenses, breaking-change detection).

### Body types beyond `theory` (0.37.0+)

`TheoryBody` now includes five additional document kinds alongside `theory` and `morphism`:

- `class`: packages a theory as a Haskell-style interface with a carrier sort.
- `instance`: declares that a specific theory satisfies a class; compiles to a checked theory morphism.
- `inductive`: expands to a closed sort plus its constructor operations.
- `composition`: replays a colimit over named bases.
- `protocol`: registers a pair of theories as a protocol with edge rules.

`TheorySpec` accepts an `imports: Vec<ImportSpec>` with alias and selective expose semantics, so protocol authors can reuse building-block theories without copying their contents. `ParamSpec` accepts `implicit: bool` on parameters that should be recovered by unification. `SortSpec` accepts `closed: Vec<String>` to declare a closed sort whose only producers are the listed operations; `Term::Case` expressions over such a sort are coverage-checked at declaration.

See the `typeclasses`, `implicit-arguments`, and `closed-sorts-and-case` skills for details.

## Further Reading

- [Tutorial Ch. 9: Building Your Own Protocol](https://panproto.dev/tutorial/chapters/09-building-your-own-protocol.html)
- [Tutorial Ch. 14: Self-Description and Building Blocks](https://panproto.dev/tutorial/chapters/14-self-description-and-building-blocks.html)
- [Tutorial Ch. 18d: Declarative Theory Specifications](https://panproto.dev/tutorial/chapters/18d-declarative-theory-specifications.html)
