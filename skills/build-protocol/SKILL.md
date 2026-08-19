---
name: build-protocol
description: >
  Build a custom protocol definition by composing building-block theories via colimit.
  Use /build-protocol to define a new schema language for panproto.
---

# Building a Custom Protocol

You are helping a user define a new protocol for panproto. A protocol is a pair of GATs (Generalized Algebraic Theories): one defining what schemas look like, one defining what instances look like. All 54 built-in protocols are composed from a small set of reusable building-block theories.

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
| `ThSimpleGraph` | Vertices + edges without the multi-edge structure | Format allows at most one edge per endpoint pair |
| `ThInterface` | Interface/implementation relationships | Format has nominal subtyping |

### Instance theory building blocks

| Theory | What it adds | Use when |
|--------|-------------|----------|
| `ThWType` | W-types (tree-structured instances) | JSON, XML, ATProto, Avro |
| `ThFunctor` | Set-valued functors (relational tables) | SQL, CSV, Parquet |
| `ThFlat` | Flat records (no nesting) | Simple key-value formats |
| `ThGraphInstance` | Graph-shaped instances | Property-graph formats |

Multi-file support is not a schema-theory block. A project is assembled as a coproduct of per-file schemas by `panproto-project`, which resolves imports afterwards and writes cross-file edges of kind `imports` into the result.

## Step 2: Compose via colimit

The named building blocks (`ThGraph`, `ThConstraint`, `ThMeta`, `ThWType`, and the rest) are Rust functions in `panproto_protocols::theories`. There is no `builtinTheory(name)` lookup on the TypeScript or Python surface, so the three paths differ in kind rather than only in syntax: Rust composes the shipped blocks directly, the SDKs declare a theory from a specification, and the theory DSL declares one as a data file.

**Rust:**
```rust
use panproto_gat::colimit_by_name;
use panproto_protocols::theories::{th_constraint, th_graph, th_meta, th_wtype};

// colimit_by_name identifies shared sorts and ops by name.
// The third argument is the shared sub-theory common to both.
let graph = th_graph();
let step1 = colimit_by_name(&graph, &th_constraint(), &graph)?;
let mut schema_theory = colimit_by_name(&step1, &th_meta(), &graph)?;
let instance_theory = th_wtype();

// The colimit names itself "<t1>_<t2>_colimit". Rename it to the name the
// protocol will reference, since a Protocol names its theories by string.
schema_theory.name = "ThMyFormatSchema".into();
```

**TypeScript:** build the theory from a specification and register it. The protocol then references it by name:
```typescript
using schemaTheory = new TheoryBuilder('ThMyFormatSchema')
  .sort('Vertex')
  .sort('Edge')
  .op('src', [['e', 'Edge']], 'Vertex')
  .op('tgt', [['e', 'Edge']], 'Vertex')
  .build(p._wasm);

// colimit(t1, t2, shared, wasm) is available for gluing two registered theories.
```

**Python:**
```python
schema_theory = (
    panproto.TheoryBuilder("ThMyFormatSchema")
    .sort("Vertex")
    .sort("Edge")
    .op("src", ["Edge"], "Vertex")
    .op("tgt", ["Edge"], "Vertex")
    .build()
)

# Or from a spec dict / a Theory document:
schema_theory = panproto.create_theory(spec)
schema_theory = panproto.Theory.from_yaml(source)

glued = panproto.colimit_theories(t1, t2, shared)
```

`colimit` and `colimit_theories` are binary and take the shared base explicitly, so a three-way composition is two calls rather than one over a list.

## Step 3: Define the protocol

A `Protocol` names its two theories by string and carries the vertex kinds, edge rules and constraint sorts alongside them.

**TypeScript:** `defineProtocol` takes one spec object:
```typescript
const proto = p.defineProtocol({
  name: 'my-format',
  schemaTheory: 'ThMyFormatSchema',
  instanceTheory: 'ThWType',
  objKinds: ['document', 'section', 'field', 'string', 'number'],
  constraintSorts: ['maxLength', 'required'],
  edgeRules: [
    { edgeKind: 'contains', srcKinds: ['document', 'section'], tgtKinds: ['section', 'field'] },
    { edgeKind: 'type-of', srcKinds: ['field'], tgtKinds: ['string', 'number'] },
  ],
  hasOrder: true,
});
```

The nine feature flags (`hasOrder`, `hasCoproducts`, `hasRecursion`, `hasCausal`, `nominalIdentity`, `hasDefaults`, `hasCoercions`, `hasMergers`, `hasPolicies`) each default to `false`. They are not decoration: they are what tells the migration and lens machinery whether your format has ordered collections, unions, or recursive types, so omitting one silently narrows what panproto will do with your schemas.

**Python:** `define_protocol` takes the same shape as a mapping, or build it from theory objects:
```python
proto = panproto.Protocol.from_theories(
    "my-format",
    schema_theory,
    instance_theory,
    obj_kinds=["document", "section", "field", "string", "number"],
    edge_rules=[
        {"edge_kind": "contains", "src_kinds": ["document"], "tgt_kinds": ["section"]},
    ],
    constraint_sorts=["maxLength"],
    has_order=True,
)
```

**Rust:** `Protocol` is a plain struct with public fields and a `Default`:
```rust
use panproto_core::schema::{EdgeRule, Protocol};

let proto = Protocol {
    name: "my-format".into(),
    schema_theory: "ThMyFormatSchema".into(),
    instance_theory: "ThWType".into(),
    obj_kinds: vec!["document".into(), "section".into(), "field".into()],
    constraint_sorts: vec!["maxLength".into()],
    edge_rules: vec![EdgeRule {
        edge_kind: "contains".into(),
        src_kinds: vec!["document".into(), "section".into()],
        tgt_kinds: vec!["section".into(), "field".into()],
    }],
    has_order: true,
    ..Protocol::default()
};
```

An `EdgeRule` with an empty `src_kinds` or `tgt_kinds` admits any vertex kind at that end, which is how the shipped protocols spell "this edge can point at anything".

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

## Step 5: Implement a codec (optional)

Everything above works on schemas and on instances you build in memory. To read and write your format's own bytes, register a codec, which is a Rust job: the codec trait is `panproto_io::registry::ProtocolCodec`, and neither the WASM boundary nor the Python extension carries a registration hook, so there is no `registerParser` on the SDKs.

```rust
use panproto_io::default_registry;
use panproto_io::registry::ProtocolCodec;

// A codec is an InstanceParser plus an InstanceEmitter. The two
// format-preserving methods have default implementations that fall back to
// the canonical path, so a codec only overrides them if it has a CST to keep.
impl ProtocolCodec for MyFormatCodec {}

let mut registry = default_registry();
registry.register(MyFormatCodec::new("my-format"));

let instance = registry.parse_wtype("my-format", &schema, &bytes)?;
let out = registry.emit_wtype("my-format", &schema, &instance)?;
```

`try_register` takes a `Result` from a fallible constructor and skips registration on `Err`, which is the shape a grammar-backed codec wants.

## Step 6: Test with existing panproto operations

Once defined, your protocol works with all panproto operations: schema building and validation, migration between versions, lens generation, breaking-change detection, version control, and cross-protocol translation.

All of that runs through an SDK. The `schema` CLI resolves `atproto` and nothing else for its `--protocol` flag, so a custom protocol is not reachable from `schema validate`, `schema compat`, `schema lens generate` or `schema auto-migrate`; each exits non-zero naming what is supported. The CLI commands that take no protocol, such as `schema diff` (whose two operands are positional), do work on a custom protocol's schemas:

```bash
schema diff old.json new.json --detect-renames
```

```typescript
p.validateSchema(schema, proto);          // -> ValidationResult
p.diff(oldSchema, newSchema);             // -> { compatibility, changes }
p.span(oldSchema, newSchema);             // -> how much the two share
using lens = p.lens(oldSchema, newSchema);
```

## Example: defining a config file protocol

```typescript
// A simple config file format with sections and key-value pairs.
using schemaTheory = new TheoryBuilder('ThConfigSchema')
  .sort('Vertex')
  .sort('Edge')
  .op('src', [['e', 'Edge']], 'Vertex')
  .op('tgt', [['e', 'Edge']], 'Vertex')
  .build(p._wasm);

const proto = p.defineProtocol({
  name: 'config',
  schemaTheory: 'ThConfigSchema',
  instanceTheory: 'ThWType',
  objKinds: ['config', 'section', 'key', 'string-value', 'int-value', 'bool-value'],
  constraintSorts: ['maxLength', 'default'],
  edgeRules: [
    { edgeKind: 'has-section', srcKinds: ['config'], tgtKinds: ['section'] },
    { edgeKind: 'has-key', srcKinds: ['section'], tgtKinds: ['key'] },
    { edgeKind: 'value-type', srcKinds: ['key'], tgtKinds: ['string-value', 'int-value', 'bool-value'] },
  ],
  hasOrder: true,
  hasCoproducts: true,
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

`TheorySpec` accepts an `imports: Vec<ImportSpec>` with alias and selective expose semantics, so protocol authors can reuse building-block theories without copying their contents. `ParamSpec` accepts `implicit: bool` on parameters that should be recovered by unification. `SortSpec` accepts `closed: Option<Vec<String>>` (absent means open) to declare a closed sort whose only producers are the listed operations; `Term::Case` expressions over such a sort are coverage-checked at declaration. `SortSpec` also carries a `kind`, which defaults to `structural` and may instead be `val`, `coercion`, or `merger`, and which is what puts a sort in the enriched layer rather than the bare graph.

See the `typeclasses`, `implicit-arguments`, and `closed-sorts-and-case` skills for details.

## Further Reading

- [Tutorial Ch. 9: Building Your Own Protocol](https://panproto.dev/tutorial/chapters/09-building-your-own-protocol.html)
- [Tutorial Ch. 14: Self-Description and Building Blocks](https://panproto.dev/tutorial/chapters/14-self-description-and-building-blocks.html)
- [Tutorial Ch. 18d: Declarative Theory Specifications](https://panproto.dev/tutorial/chapters/18d-declarative-theory-specifications.html)
