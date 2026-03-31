# Example: Bidirectional Lens Round-Trip

This example demonstrates the full lens lifecycle: generate a lens, project data forward, modify the view, restore the original, and verify the round-trip laws.

## Scenario

You have a user profile schema that is being simplified: `firstName` and `lastName` are being merged into a single `displayName` field.

## Step 1: Define schemas

```typescript
const proto = p.protocol('json-schema');

const v1 = proto.schema()
  .vertex('profile', 'object')
  .vertex('profile.firstName', 'string')
  .vertex('profile.lastName', 'string')
  .vertex('profile.email', 'string')
  .vertex('profile.age', 'integer')
  .edge('profile', 'profile.firstName', 'property', { name: 'firstName' })
  .edge('profile', 'profile.lastName', 'property', { name: 'lastName' })
  .edge('profile', 'profile.email', 'property', { name: 'email' })
  .edge('profile', 'profile.age', 'property', { name: 'age' })
  .constraint('profile.firstName', 'required', 'true')
  .constraint('profile.lastName', 'required', 'true')
  .constraint('profile.email', 'required', 'true')
  .build();

const v2 = proto.schema()
  .vertex('profile', 'object')
  .vertex('profile.displayName', 'string')
  .vertex('profile.email', 'string')
  .vertex('profile.age', 'integer')
  .edge('profile', 'profile.displayName', 'property', { name: 'displayName' })
  .edge('profile', 'profile.email', 'property', { name: 'email' })
  .edge('profile', 'profile.age', 'property', { name: 'age' })
  .constraint('profile.displayName', 'required', 'true')
  .constraint('profile.email', 'required', 'true')
  .build();
```

## Step 2: Generate a lens with a merge transform

Auto-generation alone cannot determine how to merge `firstName` + `lastName` into `displayName`. We provide a hint:

```typescript
const chain = p.protolensChain(v1, v2, {
  transforms: [
    {
      type: 'MergeFields',
      sources: ['profile.firstName', 'profile.lastName'],
      target: 'profile.displayName',
      merge: '\\first last -> first ++ " " ++ last',
      split: '\\full -> let parts = split " " full in (head parts, join " " (tail parts))',
    },
  ],
});
```

The `merge` expression combines two fields. The `split` expression reverses it. Both are needed for the round-trip.

## Step 3: Forward projection (get)

```typescript
const record = {
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  age: 30,
};

const { view, complement } = chain.get(record);
// view = {
//   displayName: "Alice Smith",
//   email: "alice@example.com",
//   age: 30,
// }
// complement = {
//   split: { firstName: "Alice", lastName: "Smith" },
//   removed: [],
// }
```

The complement stores the original `firstName` and `lastName` so the merge can be reversed.

## Step 4: Modify the view

```typescript
const modified = {
  ...view,
  displayName: "Alice Johnson",  // changed last name
  age: 31,                        // birthday
};
```

## Step 5: Backward restoration (put)

```typescript
const restored = chain.put(modified, complement);
// restored = {
//   firstName: "Alice",
//   lastName: "Johnson",    // split applied: "Alice Johnson" -> ("Alice", "Johnson")
//   email: "alice@example.com",
//   age: 31,
// }
```

The `split` expression decomposed "Alice Johnson" back into firstName/lastName.

## Step 6: Verify lens laws

```typescript
const laws = p.checkLensLaws(chain, record);
console.log(laws.getPut); // true: put(get(s), complement(s)) === s
console.log(laws.putGet); // true: get(put(t', c)) === t'
```

**GetPut**: projecting then restoring with the original complement gives back the original record.
**PutGet**: restoring then projecting gives back the modified view.

## CLI equivalent

```bash
schema lens generate v1.json v2.json \
  --merge "firstName,lastName -> displayName" \
  --merge-expr '\first last -> first ++ " " ++ last' \
  --split-expr '\full -> let parts = split " " full in (head parts, join " " (tail parts))' \
  > lens.json

schema lens apply lens.json record.json
schema lens apply --direction put lens.json modified.json complement.json
schema lens verify lens.json --instance record.json
```

## Key takeaway

The complement is what makes bidirectional migration possible without data loss. Even when fields are merged (a lossy operation), the complement stores enough information to reverse it. The lens laws guarantee consistency: you can freely move data between schema versions and always get back to where you started.
