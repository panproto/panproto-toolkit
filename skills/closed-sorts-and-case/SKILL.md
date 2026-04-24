---
name: closed-sorts-and-case
description: >
  Closed sorts (SortClosure::Closed(ops)) and Term::Case: how the typechecker verifies
  coverage at sort declaration and branch consistency at term construction. Covers
  the Stan-emitter-as-total-function example from the book.
---

# Closed Sorts and Case

You are helping a user work with closed sorts and pattern matching introduced in panproto 0.37.0. A closed sort declares exactly the operations allowed to produce values of that sort; case expressions on such a sort are checked for exhaustiveness at declaration time, so branch dispatch is guaranteed total.

## The API

`Sort` gained a `closure: SortClosure` field. The two variants are:

- `SortClosure::Open`: any operation returning the sort is a legal producer (historical behavior).
- `SortClosure::Closed(op_names)`: only the listed operations produce values of this sort. Any attempt to register another producing operation is rejected at theory elaboration.

`Term::Case { scrutinee, branches }` is a new term variant. Each branch names one of the closure operations plus binders for its arguments. The typechecker enforces two properties:

- Coverage: the set of branches is exactly the closure's op names (no missing case, no stray case).
- Branch consistency: every branch body has the same sort as the scrutinee's target sort under its bindings.

In the DSL, `SortSpec` has an optional `closed: Vec<String>` naming the operations that close the sort.

## Motivating example: Stan as a total function

From the book chapter: the Stan emitter is authored as a case on a closed sort of Stan AST constructors. Because the sort is closed and every branch must match a constructor, emission is a total function. Adding a new Stan construct means adding a constructor to the closed sort, which forces every case expression over that sort (including the emitter) to update; the typechecker will not let you forget.

This is the structural benefit of closed sorts: completeness failures are surfaced at the boundary where new constructors arrive, not as runtime crashes inside emitters.

## Authoring pattern

1. Declare the sort with a `closed` list naming every constructor operation.
2. Declare those constructor operations as usual; the elaborator verifies they match the closure and that no other operation shadows them.
3. Write `Term::Case` expressions over the sort; the elaborator rejects missing or spurious branches.
4. When you later add or remove a constructor, update the closure; every case expression on the sort becomes a compile error until it matches the new shape.

## Interaction with other 0.37.0 features

- Implicit arguments: closure operations can carry implicit parameters; the case elaborator threads them through the pattern and the branch body.
- Rewriting: closed sorts interact well with termination proofs because the set of producers is finite and known.
- Typed holes can stand in for branch bodies during incremental development; `typecheck_term_with_holes` reports the expected sort and context at each hole.
- Let bindings in branch bodies use capture-avoiding substitution, so rebinding a pattern variable inside a branch is safe.

## Further reading

- `book/src/core/dependent-sorts.md`: the extended chapter now covers closed sorts and the Stan emitter example.
- `book/src/core/typeclasses.md`: class instances on closed sorts give total operation tables.
