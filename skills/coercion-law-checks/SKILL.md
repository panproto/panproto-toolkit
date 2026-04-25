---
name: coercion-law-checks
description: >
  Run sample-based coercion law verification on theory documents. Covers the
  `schema theory check-coercion-laws` CLI gate (0.38.0+), CoercionClass semantics
  (Iso, Retraction, Projection, Opaque), and GitHub Actions integration.
---

# Coercion Law Checks

You are helping a user set up sample-based verification of coercion laws in their theory documents. A directed equation that declares itself an `Iso` or `Retraction` is making a promise about round-trip behavior; the checker falsifies that promise on concrete samples before it corrupts a migration.

## What a coercion class promises

Every `DirectedEquation` in a theory body carries a `CoercionClass` that declares how the forward and inverse expressions relate on data.

| Class | Promise | Round-trip law checked |
|-------|---------|------------------------|
| `Iso` | Bijection. Both directions are total and inverse. | `inv(fwd(x)) = x` AND `fwd(inv(y)) = y` |
| `Retraction` | Forward is total; inverse has a left inverse on the forward image. | `inv(fwd(x)) = x` (one direction only) |
| `Projection` | Forward is total and deterministic; inverse may drop information. | `fwd(x)` is deterministic; round-trip is not required |
| `Opaque` | No round-trip promise; the pair is documentation only. | None (always passes) |

The checker enumerates samples per `ValueKind`, evaluates forward and inverse on each, and reports every falsifying sample as a `CoercionLawViolation`.

## Why honest declarations matter

A dishonest `Iso` declaration breaks the asymmetric-lens put law. Auto-lens generation at `Lenient+` will happily emit a coerce anchor against a declared `Iso`; if the forward is actually lossy, every backward lift after the migration rounds off data silently. Catching this at the theory level is cheap; catching it in production after thousands of records have been lifted is not.

## The CI gate

```bash
schema theory check-coercion-laws path/to/theory.ncl --json
```

Exit code is non-zero when any declared coercion class is falsified. JSON output shape, per theory:

```json
{
  "theory": "my.theory",
  "clean": false,
  "total_violations": 2,
  "equations": [
    {
      "name": "my_coercion",
      "violations": [
        { "kind": "Backward", "sample": 3, "forward": 3, "inverse": 2 },
        { "kind": "MissingInverse" }
      ]
    }
  ]
}
```

The `kind` field is a serde-tagged variant of `CoercionLawViolation`:

| Kind | Meaning |
|------|---------|
| `Backward` | `inv(fwd(x)) != x` for some sample. Breaks `Iso` or `Retraction`. |
| `Forward` | `fwd(inv(y)) != y`. Breaks `Iso`. |
| `NonDeterministic` | Same input produced different outputs across samples. |
| `MissingInverse` | Class is `Iso` or `Retraction` but no inverse expression is declared. |
| `ForwardEvalError` | Forward expression failed to evaluate (often unbound variable). |
| `InverseEvalError` | Inverse expression failed to evaluate. |
| `UnknownClass` | Sample registry had no samples for the declared `ValueKind`. |

If the bulk of your violations are `ForwardEvalError` entries complaining about an unbound variable, the theory's equations bind a free variable other than the default `x`. The CLI surfaces a hint line when this happens; pass the binder explicitly:

```bash
schema theory check-coercion-laws path/to/theory.ncl --var-name y --json
```

## Sample-based is sound but incomplete

Passing the gate is evidence, not proof. The checker only sees the samples in its registry; a dishonest `Iso` that happens to round-trip on every default `Int`, `Float`, `Str`, and `Bool` sample still passes. This is the correct tradeoff for CI: fast, deterministic, and catches the overwhelming majority of real errors (type mistakes, off-by-one offsets, forgotten null handling). For stronger guarantees, pair the sample check with proof obligations in your theory's equational reasoning pass.

## Customizing the sample registry

`CoercionSampleRegistry::with_defaults()` ships representative samples per `ValueKind`. For user-defined kinds, register samples in Rust:

```rust
use panproto_lens::coercion_laws::{CoercionSampleRegistry, check_theory};

let mut registry = CoercionSampleRegistry::with_defaults();
registry.insert(my_value_kind, vec![sample_a, sample_b, sample_c]);

let report = check_theory(&theory, &registry);
```

Or hook it into the DSL compile step:

```rust
use panproto_theory_dsl::compile_theory_with_law_check;

let theory = compile_theory_with_law_check(&spec, &registry)?;
```

The DSL-side call returns `TheoryDslError::CoercionLawViolation` on failure, so an unchecked theory never escapes the build.

For the auto-lens pipeline, pass the registry through `AutoLensConfig`:

```rust
use panproto_lens::{AutoLensConfig, FilterOptions, UnknownSamplesPolicy};

let config = AutoLensConfig {
    coercion_law_registry: Some(registry),
    filter_options: FilterOptions::with_unknown(UnknownSamplesPolicy::Drop),
    ..Default::default()
};
```

`FilterOptions` has a single field, `unknown: UnknownSamplesPolicy`, with two variants:

| Policy | Behavior |
|--------|----------|
| `Keep` (default) | Proposals whose source `ValueKind` has no registered samples, or whose witness expression cannot be located, are kept. Preserves pre-0.38 behavior. |
| `Drop` | Same proposals are filtered out. Strictest filter: only coerce anchors whose declared class was actually exercised on samples survive. |

For ad-hoc filtering outside the auto-lens path, call `filter_coerce_proposals_by_law_check_with_policy(proposals, &registry, options)` directly; it returns `(kept, dropped)` so you can log the rejected anchors.

## The `verifyCoercionLaws` lexicon

Service-mediated callers (federated panproto nodes, MCP, web playground) drive the same checker through `dev.panproto.translate.verifyCoercionLaws`, a `procedure` lexicon that takes:

- `class`: one of `iso`, `retraction`, `projection`, `opaque`
- `forwardExpr`, `inverseExpr`: panproto-expr source for the two directions
- `varName`: the binder used by both expressions (default `x`)
- `valueKind`: one of `bool`, `int`, `float`, `str`, `bytes`, `token`, `null`, `any` (matches `ValueKind`)
- `samples` (optional): explicit literal samples, otherwise the default registry is used
- `filter` (optional): `#filterOptions` object with `unknown: "keep" | "drop"`

It returns `sampleCount` and a list of `#coercionLawViolation` entries (same `kind` taxonomy as the CLI report). Use this when integrating the checker into a non-Rust toolchain that already speaks Lexicons.

## GitHub Actions integration

Create `.github/workflows/coercion-laws.yml`:

```yaml
name: Coercion Law Check
on:
  pull_request:
    paths:
      - 'theories/**'

jobs:
  check-coercion-laws:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install panproto CLI
        run: |
          curl --proto '=https' -LsSf \
            https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh

      - name: Verify coercion laws
        run: |
          failed=0
          for theory in theories/**/*.ncl; do
            echo "## $theory" >> "$GITHUB_STEP_SUMMARY"
            if ! schema theory check-coercion-laws "$theory" --json > /tmp/report.json 2>&1; then
              echo "::error file=$theory::Coercion law violation(s)"
              jq . /tmp/report.json >> "$GITHUB_STEP_SUMMARY"
              failed=1
            else
              echo "clean" >> "$GITHUB_STEP_SUMMARY"
            fi
          done
          exit $failed
```

Pair this with the breaking-change gate (`/panproto-breaking-change-ci`) so PRs that touch a theory must pass both structural compatibility and coercion honesty before merging.

## When to run locally

Before every `schema lens generate` run over a theory you have edited. The checker is fast enough (milliseconds per equation) to run on save; wire it into your editor's on-save hook or a pre-commit step if your theories live in version control.

## Further Reading

- [Tutorial Ch. 6: Bidirectional Migration with Lenses](https://panproto.dev/tutorial/chapters/06-bidirectional-migration-with-lenses.html)
- [Tutorial Ch. 17: Automatic Lens Generation](https://panproto.dev/tutorial/chapters/17-automatic-lens-generation.html)
