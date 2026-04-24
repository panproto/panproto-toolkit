---
name: implicit-arguments
description: >
  Implicit arguments on operations: the Implicit::Yes tag, Robinson unification against
  explicit arg sorts at call sites, and guidance for when to mark a parameter implicit
  vs explicit. Covers the DSL ParamSpec.implicit field.
---

# Implicit Arguments

You are helping a user work with implicit operation arguments introduced in panproto 0.37.0. An implicit argument is one the caller never writes down; the typechecker recovers it by unifying the explicit arguments' sorts against the operation's declared input sorts.

## Motivation

Dependent sorts often force callers to pass type-level arguments that are redundant with the term-level ones. Consider `nil<a> : List<a>`. The `a` is determined once you know the expected return sort or the sort of the surrounding context. Forcing the caller to write `nil<Int>` instead of just `nil` is noise.

Implicit arguments move those redundancies into the elaborator. The operation still has them as inputs internally; the surface syntax omits them and the typechecker fills them in.

## The API

`Operation::inputs` is a list of input specifications. Each one carries an `Implicit` tag, either `Implicit::No` or `Implicit::Yes`. Implicit inputs never appear in call-site argument lists; they are inferred by Robinson unification against the sorts of the explicit arguments.

In the DSL, `ParamSpec` has an optional `implicit: bool` field. Set it `true` on parameters that the elaborator should recover.

## When to mark a parameter implicit

Mark a parameter implicit when its value is determined by the sorts of other parameters or by the expected return sort. Typical cases:

- The carrier sort of a class operation (it is determined by the receiver).
- A length or shape index that also appears inside one of the explicit argument sorts.
- A refinement witness that is uniquely determined by the surrounding dependent type.

Do not mark a parameter implicit when:

- It carries genuine information the caller chooses (a default value, a configuration flag).
- It does not appear in any explicit input's sort or in the return sort (unification has nothing to pin it to).
- The operation is used in symbolic / partial-evaluation contexts where you want the caller to write it down.

## Elaboration and errors

At a call site the elaborator collects the explicit argument sorts, sets up unification variables for the implicit parameters, and solves. A failure to unify is reported with the unification constraint that broke, not a generic "missing argument" message.

If unification leaves an implicit variable undetermined, the elaborator reports an ambiguity. The usual fix is to add an explicit ascription at the call site or to reorganize the operation so the implicit parameter is determined.

## Interaction with other 0.37.0 features

- Closed sorts plus `Term::Case` use implicit arguments for coverage checking; the closure operations are matched without rewriting the whole scrutinee sort at each branch.
- Class operations frequently carry the carrier as implicit; instances then give a concrete sort for the carrier without the caller naming it.
- Typed holes (`Term::Hole`) cooperate: a hole inside an implicit-argument call can be left for the user to fill while the typechecker reports the inferred expected sort.

## Further reading

- `book/src/foundations/gats.md`: extended with a section on implicit argument elaboration.
- `book/src/core/dependent-sorts.md`: motivating examples for dependent indices.
