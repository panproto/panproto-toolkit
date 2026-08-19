# Example: Setting Up a CI Pipeline for Schema Safety

This example shows how to add panproto schema checks to a project's CI pipeline, protecting against accidental breaking changes.

## Scenario

Your team maintains an API with schemas in `schemas/`. You want:
1. Schema validation on every push
2. Breaking change detection on every PR
3. A gate that blocks merging breaking changes unless explicitly acknowledged

## Step 1: Install the panproto CLI in CI

Add to every workflow that needs panproto:

```yaml
- name: Install panproto CLI
  run: |
    curl --proto '=https' -LsSf \
      https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh
```

## Step 2: Add schema validation

Copy `templates/github-actions/schema-check.yml` to `.github/workflows/`:

```yaml
name: Schema Check
on:
  push:
    paths: ['schemas/**']
  pull_request:
    paths: ['schemas/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install panproto CLI
        run: curl --proto '=https' -LsSf https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh
      - name: Validate schemas
        run: |
          for file in schemas/*.json; do
            schema validate --protocol atproto "$file"
          done
```

Two constraints govern what you can put in that loop.

`--protocol` names a protocol the CLI resolves, and the CLI resolves one: `atproto`. The other fifty-three built-ins are reachable through the SDKs, so a project in OpenAPI, Avro, or JSON Schema gates in CI by running a short Node or Python script over `@panproto/core` or `panproto` rather than by calling `schema validate`.

`schema validate` reads panproto's own serialized schema JSON, which is what `Schema.to_json()` (Python), `schema.toJson()` (TypeScript), and `serde_json::to_string(&schema)` (Rust) write. Point it at a lexicon document or a project directory and it reports a parse failure. `schema compat` and `schema diff` are the two commands that accept the wider set of inputs.

## Step 3: Add the breaking change gate

Copy `templates/github-actions/breaking-change-gate.yml` to `.github/workflows/`.

This workflow:
1. Compares each changed schema file against the base branch version
2. Runs `schema compat <old> <new> --protocol <protocol>` to classify each change
3. Reads that command's exit code rather than grepping its text: `0` no breaking changes, `1` at least one, `2` a usage or load error
4. If any change is breaking, blocks the PR
5. Writes a report to the job summary explaining what broke
6. Allows override via the `breaking-change-acknowledged` label

Reading the exit code is what makes the gate robust: a load error is distinguished from a clean pass rather than being silently treated as one, and the workflow fails loudly on an unreadable pair.

A note on lexicon projects. A lexicon set is one schema, not a pile of them, and references across documents resolve only when the set is compared as a bundle. Each operand of `schema compat` may be panproto's serialized schema JSON, a single schema document, a manifest-backed project directory, or a source tree, so to gate the project as a whole, check the directory out at both revisions and hand `schema compat` the two directories instead of looping file by file:

```bash
git worktree add /tmp/base "origin/$BASE_REF"
schema compat /tmp/base/schemas schemas --protocol "$PROTOCOL"
```

## Step 4: Create the override label

In your GitHub repo, go to Issues > Labels > New label:
- Name: `breaking-change-acknowledged`
- Color: `#d73a4a` (red)
- Description: "Intentional breaking schema change"

## Step 5: Add pre-commit validation (optional)

For faster feedback, add schema validation as a pre-commit hook:

```bash
pip install pre-commit
```

Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: schema-validate
        name: Validate schemas
        entry: schema validate --protocol atproto
        language: system
        files: ^schemas/.*\.json$
```

```bash
pre-commit install
```

## Step 6: Add data migration checks (optional)

If you have test data files, add a migration dry-run:

Copy `templates/github-actions/data-migration.yml` to `.github/workflows/`.

It runs `schema auto-migrate` on each changed pair and then a `schema data convert` dry run. `schema auto-migrate` runs the span search, which never refuses for want of a match: it reports how much of the old schema the new one covers, together with the interval the search proved the quality lies in. So the signal to watch in CI is *coverage falling*, not the command failing.

This catches cases where:
- A schema change drops coverage sharply, which is a rename or a restructure the search could not follow
- Data files fail conversion (constraint violations, type mismatches)
- The old schema names a protocol the CLI does not carry, which `auto-migrate` now refuses rather than searching

## Result

With all three workflows in place:
- Every push validates schema syntax
- Every PR checks for breaking changes
- Breaking changes require explicit acknowledgment
- Data migration is tested before merge

Your team can evolve schemas confidently.
