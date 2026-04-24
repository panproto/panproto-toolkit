---
name: repl
description: >
  Quickstart for the panproto-repl binary (0.37.0+). Ghci-style interactive shell for
  theories and terms: :load, :theories, :use, :sorts, :ops, :type, :normalize, :model,
  :instance, :quit.
---

# REPL

You are helping a user work with `panproto-repl`, the interactive shell introduced in panproto 0.37.0. It behaves like ghci or `cargo repl` for the theory layer: load a document, inspect the theories it defines, type and normalize terms under rewrites, and print a fragment of the free model.

## Installation

`panproto-repl` ships as its own crate and its own binary. `cargo install panproto-repl` puts the `panproto-repl` binary on your path. The toolkit templates do not invoke it automatically; it is an interactive tool you run by hand.

## Commands

| Command | Effect |
|---------|--------|
| `:load <path>` | Load a theory document (nickel, JSON, YAML). Replaces the session state. |
| `:theories` | List the theory names defined by the loaded document. |
| `:use <name>` | Make theory `<name>` the active theory for subsequent term commands. |
| `:sorts` | List sorts of the active theory. |
| `:ops` | List operations of the active theory, with their arities. |
| `:type <term>` | Typecheck a term and print its sort. |
| `:normalize <term>` | Normalize a term under the active theory's directed equations. |
| `:model [depth]` | Print a fragment of the free model up to the given depth (default small). |
| `:instance` | Print the compiled form of the last loaded instance body. |
| `:quit` | Exit the REPL. |

## Typical workflows

### Inspect a new theory document

1. `:load schemas/my-theory.ncl`
2. `:theories`
3. `:use MyTheory`
4. `:sorts` and `:ops` to understand the surface.

### Debug a term that fails to typecheck

1. `:load ...` then `:use ...` as above.
2. `:type <term>`; the error includes the unification state so you can tell which implicit argument went wrong.
3. Insert a typed hole (`?h`) in the term and `:type` again to see the expected sort and context.

### Check normalization under a rewrite system

1. Load a document whose theory has directed equations.
2. `:normalize <term>`; the REPL applies the rewrite system until normal form, respecting a step budget.
3. Compare with `:type` to confirm the sort is preserved.

### Explore an inductive closure

1. Load a theory defining an inductive body.
2. `:sorts` shows the closed sort; `:ops` shows its constructors.
3. `:model 3` prints constructor trees up to depth 3, useful for small exhaustive tests.

## Relationship to the CLI

The REPL is complementary to `panproto theory validate` and `panproto theory compile`. The CLI verbs do batch checking; the REPL does exploratory inspection. Use the REPL while authoring a theory, use the CLI verbs in CI.

## Further reading

- `book/src/core/typeclasses.md`: classes and instances are convenient to explore in the REPL.
- `book/src/foundations/rewriting.md`: normalization and confluence behave the way the REPL demonstrates.
