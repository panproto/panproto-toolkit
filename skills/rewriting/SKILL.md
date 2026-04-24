---
name: rewriting
description: >
  Directed equations, normalization, confluence (Knuth-Bendix critical pairs), and
  termination (lexicographic path ordering). Author DirectedEquation rule sets and
  run check_local_confluence / check_termination_via_lpo from panproto_gat::rewriting.
---

# Rewriting

You are helping a user work with the rewriting module introduced in panproto 0.37.0. This module turns an equational theory into a rewrite system, checks that the system terminates and is locally confluent, and uses it to decide definitional equality modulo rewrites.

## Why rewriting

An equation like `append(append(xs, ys), zs) = append(xs, append(ys, zs))` can be read as a two-way equation, or as a directed rewrite left-to-right. Directed rewrites drive the computational interpretation of a theory: normalization, decision procedures for equality, simplification during migration. The catch is that a rewrite system only behaves well when it terminates (every sequence of rewrites ends) and is locally confluent (rewrites can be reunified; divergence is local).

## Authoring directed equations

A `DirectedEquation` pairs a left-hand-side pattern with a right-hand-side pattern and orients the rewrite from left to right. Collect them into a `Vec<DirectedEquation>` and pass to the analysis and normalization routines.

## Analyses

### Local confluence

`panproto_gat::rewriting::check_local_confluence(rules)` computes Knuth-Bendix critical pairs between every pair of rules and reports any pair that fails to converge. A clean run means the system is locally confluent; combined with termination this gives full confluence, which is what you need for a decision procedure on equality modulo the rewrites.

### Termination via LPO

`check_termination_via_lpo(rules, precedence)` attempts to orient every rule with a lexicographic path ordering for the given operator precedence. A successful orientation is a proof of termination. A failure suggests changing the precedence, splitting a rule, or rewriting by hand.

## Definitional equality modulo rewrites

With a confluent, terminating rule set `R`:

- `SortExpr::alpha_eq_modulo_rewrites(other, rules, step_limit)` normalizes both expressions under `R` with a step budget and compares alpha-equivalence.
- `typecheck_equation_modulo_rewrites` accepts an equation as proved when the two sides are joinable.

Use the step limit as a safety net even for terminating systems; it is cheap insurance against pathological blowups.

## Typical workflow

1. Collect the equations that should be directional (simplification rules, algebraic identities, unfolding rules).
2. Pick a precedence over operations that puts constructors below destructors and splits the common sources of nonterm.
3. Run `check_termination_via_lpo` first; fix failures before looking at confluence.
4. Run `check_local_confluence`; resolve every critical pair, either by orienting a new rule (Knuth-Bendix completion step) or by reasoning why the divergence is spurious.
5. Use `alpha_eq_modulo_rewrites` or `typecheck_equation_modulo_rewrites` wherever equality modulo these rules matters (term equality, migration verification, lens law checks).

## Further reading

- `book/src/foundations/rewriting.md`: the new chapter on directed equations, LPO, and Knuth-Bendix.
- `book/src/core/dependent-sorts.md`: extended with examples that rely on definitional equality modulo rewrites.
