# Example: Bidirectional Lens Round-Trip

This example demonstrates the full lens lifecycle: generate a lens, project data forward, modify the view, restore the original, and verify the round-trip laws.

## Scenario

A user profile schema is being simplified. `firstName` becomes `displayName`, uppercased on the way out, and `internalId` is dropped from the public view.

The two changes illustrate the two things a complement carries. The rename plus uppercase is *invertible*: the transform replaces the coordinate it read, so an edit to `displayName` sends a value back to `firstName`. The drop is not invertible from the view at all; `internalId` survives only because the complement records it.

## Step 1: Define schemas

JSON Schema's object kinds are `object`, `array`, `string`, `integer`, `boolean`, `unknown`, `not`, `if`, `then`, `else`, and `union`. Its property edges use the edge kind `prop`.

```typescript
const proto = p.protocol('json-schema');

const v1 = proto.schema()
  .vertex('profile', 'object')
  .vertex('profile.firstName', 'string')
  .vertex('profile.email', 'string')
  .vertex('profile.age', 'integer')
  .vertex('profile.internalId', 'string')
  .edge('profile', 'profile.firstName', 'prop', { name: 'firstName' })
  .edge('profile', 'profile.email', 'prop', { name: 'email' })
  .edge('profile', 'profile.age', 'prop', { name: 'age' })
  .edge('profile', 'profile.internalId', 'prop', { name: 'internalId' })
  .constraint('profile.email', 'format', 'email')
  .build();

const v2 = proto.schema()
  .vertex('profile', 'object')
  .vertex('profile.displayName', 'string')
  .vertex('profile.email', 'string')
  .vertex('profile.age', 'integer')
  .edge('profile', 'profile.displayName', 'prop', { name: 'displayName' })
  .edge('profile', 'profile.email', 'prop', { name: 'email' })
  .edge('profile', 'profile.age', 'prop', { name: 'age' })
  .constraint('profile.email', 'format', 'email')
  .build();
```

## Step 2: Build the chain

Two routes reach a `ProtolensChainHandle`. The fluent builder assembles combinator steps in process:

```typescript
import { PipelineBuilder } from '@panproto/core';

const chain = new PipelineBuilder(wasm)
  .renameField('profile', 'firstName', 'displayName')
  .removeField('profile.internalId')
  .build();
```

The declarative route compiles a lens document, which is what to reach for when the lens should be reviewed in a pull request or version-controlled beside the schemas. It is the only route that carries value-level transforms:

```typescript
const chain = p.compileLensDocument({
  id: 'dev.example.profile.simplify',
  source: 'v1',
  target: 'v2',
  steps: [
    { rename_field: { old: 'firstName', new: 'displayName' } },
    { apply_expr: {
        field: 'displayName',
        expr: 'upper(displayName)',
        inverse: 'lower(displayName)',
        coercion: 'iso',
    } },
    { remove_field: 'profile.internalId' },
  ],
}, 'profile');
```

`apply_expr` replaces the value it read, so `displayName` stays an independent coordinate and its inverse sends an edit back to the field the forward expression reads. That field is identified as the expression's *sole* free variable. A computation over two source fields, the kind that merges `firstName` and `lastName` into one string, has no single coordinate to restore and is not a bijection whatever its declared coercion class says; express that as a drop plus a computed field and let the complement carry the originals.

## Step 3: Instantiate and project forward

A chain is a schema-parameterized family. Instantiate it at a concrete schema to get the lens that moves data:

```typescript
const lens = chain.instantiate(v1);

const record = {
  firstName: 'Alice',
  email: 'alice@example.com',
  age: 30,
  internalId: 'u-8831',
};

const { view, complement } = lens.getJson(record, 'profile');
// view = { displayName: 'ALICE', email: 'alice@example.com', age: 30 }
```

The complement is opaque bytes. It holds two different things: the residue, which is what `get` discarded and the view genuinely lacks (`internalId`), and the reassembly bookkeeping, which is the parent map, the arc order, and the arc edges, none of which carries information the view does not already determine. Only the residue decides whether the lens is an isomorphism, which is why a chain that renames every field and drops nothing can still round-trip from a stored view.

## Step 4: Modify the view

```typescript
const modified = { ...view, displayName: 'ALICIA', age: 31 };
```

## Step 5: Restore backward

```typescript
const restored = lens.putJson(modified, complement, 'profile');
// restored = {
//   firstName: 'alicia',       // the inverse ran and wrote back to firstName
//   email: 'alice@example.com',
//   age: 31,
//   internalId: 'u-8831',      // recovered from the complement
// }
```

`put` inverts `get` on the image of `get` and nowhere else, so a complement the lens could not have produced is refused rather than silently returning an empty record. Collection order survives: the complement records the source's arc sequence and the backward direction replays both restoration paths in it, so array children come back in their original positions rather than permuted.

## Step 6: Reconstruct without a complement

A view read back from storage has no complement, because the complement is produced by an in-process `get`. That reconstruction is possible exactly when the lens is an isomorphism, which is to say when the complement is trivial:

```typescript
if (lens.isIsomorphism()) {
  const fromStorage = lens.putJsonWithoutComplement(view, 'profile');
} else {
  console.log(lens.isomorphismObstruction());
  // 'vertex `profile.internalId` does not survive, so its data is set aside in the complement'
}
```

The lens above is not an isomorphism, and the obstruction names why: `internalId` is dropped, so `get` is not injective and distinct sources share a view. Availability is a property of the lens rather than of any record, so this answers once for every view the lens will produce and a caller can branch statically instead of catching a throw.

## Step 7: Verify lens laws

```typescript
const instance = p.parseJson(v1, JSON.stringify(record));
const laws = lens.checkLaws(instance._bytes);
```

**GetPut**: projecting then restoring with the original complement gives back the original record. Checked strictly, since its view argument is `get(s)` and is consistent by construction.

**PutGet**: restoring an edited view then projecting gives back that view. Checked modulo derived components, since a view carrying a coordinate pinned by the independent ones is not a free view space and an edit that leaves the derived coordinate stale sits outside the image of `get`.

A transform counts as an independent coordinate only when it *replaces* what it read. `up = upper(a)` with `a` still in the view is derived, because `get` recomputes `up` from `a` whatever the inverse says; the same computation followed by dropping `a` is independent, and an edit to `up` round-trips to `a` exactly.

## CLI equivalent

The `schema` CLI resolves one protocol, `atproto`. The other fifty-three built-ins, json-schema among them, are reachable only through the SDKs, so the commands below are written for an ATProto pair. The shapes are the same whatever the protocol.

```bash
schema lens generate v1.json v2.json --protocol atproto --save lens.json --explain
schema lens inspect lens.json --protocol atproto
schema lens apply lens.json record.json --protocol atproto --direction forward
schema lens apply lens.json view.json --protocol atproto \
  --direction backward --complement complement.bin
schema lens compile profile-lens.ncl --body-vertex profile --out lens.json
```

`schema lens compile` takes a lens DSL document in Nickel, JSON, or YAML and emits the protolens chain; `--body-vertex` names the parent under which field-level steps attach and defaults to `record:body`. The concrete law checks run from an SDK rather than from the CLI: `schema lens verify` takes two *schemas* and reports the shape of the lens between them, not a data file.

## Key takeaway

The complement is what makes bidirectional migration possible without data loss. A dropped field survives in it and is restored exactly; a value transform that replaces its input survives through its inverse. What no complement can manufacture is a bijection where the forward direction is not injective, which is why `isIsomorphism` answers that question up front rather than at the first record that fails.
