---
name: typeclasses
description: >
  Haskell-style typeclasses as colimits: author class and instance documents in the
  DSL, or use the class!/instance!/derive_theory! proc-macros from panproto-gat-macros
  for Rust-side construction. Classes compile to theories; instances compile to checked
  theory morphisms.
---

# Typeclasses

You are helping a user work with the class and instance surface introduced in panproto 0.37.0. This surface gives a Haskell-style way to package a theory (the class), state that a specific theory satisfies it (the instance), and verify the mapping by actually elaborating a theory morphism.

## Core idea

A class is a theory packaged for reuse. Given a class `C` with carrier sort `a` and some operations, an instance of `C` at theory `T` is a theory morphism `C -> T` that picks a concrete sort in `T` for `a` and concrete operations in `T` for every operation of `C`. The checker confirms that the mapping preserves sorts, arities, and equations.

This is the same story as a colimit over the diagram of classes that `T` participates in: the elaborated theory is what you get when every class commitment is glued into `T`.

## Authoring classes and instances

### DSL documents

`TheoryBody::Class` and `TheoryBody::Instance` are first-class document bodies, alongside `Theory`, `Morphism`, `Composition`, `Protocol`, and `Inductive`.

A class body declares a carrier sort plus operations and equations over that carrier. An instance body names the target theory, picks the sort assignment, and gives an operation assignment. The compiler emits a theory morphism and typechecks it.

### Rust proc-macros

`panproto-gat-macros` ships three proc-macros for constructing theories, classes, and instances from Rust source.

- `class! { ... }` builds a class in the current crate.
- `instance! { ... }` builds an instance; the compiler verifies the morphism at macro-expansion time.
- `derive_theory! { ... }` derives a theory from a Rust type plus annotations.

Use the proc-macros when the theory lives alongside Rust code and you want `cargo check` to catch morphism violations. Use DSL documents when the theory is data, lives under version control, or is consumed by non-Rust tooling.

## Typical workflow

1. Identify a reusable algebraic interface (monoid, functor, ordered set, numeric tower).
2. Write a class document (or `class! { ... }`) with the carrier sort, operations, and laws.
3. For each concrete theory `T` that should satisfy the class, write an instance document (or `instance! { ... }`) mapping the carrier to a sort of `T` and the operations to operations of `T`.
4. Run `panproto theory validate` on the document; the checker elaborates the morphism and rejects mismatches.
5. Reference the class from downstream protocols or migrations; instances provide the concrete witnesses.

## Interaction with other 0.37.0 features

- Inductive bodies often pair with class instances: a closed sort and its constructors provide a concrete carrier, and a class instance wires that carrier into the abstract interface.
- Implicit arguments let a class operation elide obvious sort parameters; the typechecker recovers them at call sites via Robinson unification.
- Class equations participate in definitional equality modulo rewrites when the equations are oriented as a terminating, locally confluent rewrite system.

## Further reading

- `book/src/core/typeclasses.md`: the chapter introducing the surface.
- `book/src/foundations/gats.md`: extended with the class-as-theory and instance-as-morphism correspondence.
