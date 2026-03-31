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
            schema validate --protocol openapi "$file"
          done
```

## Step 3: Add the breaking change gate

Copy `templates/github-actions/breaking-change-gate.yml` to `.github/workflows/`.

This workflow:
1. Compares each changed schema file against the base branch version
2. Runs `schema check` to classify each change
3. If any change is breaking, blocks the PR
4. Posts a comment explaining what broke
5. Allows override via the `breaking-change-acknowledged` label

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
        entry: schema validate --protocol openapi
        language: system
        files: ^schemas/.*\.json$
```

```bash
pre-commit install
```

## Step 6: Add data migration checks (optional)

If you have test data files, add a migration dry-run:

Copy `templates/github-actions/data-migration.yml` to `.github/workflows/`.

This catches cases where:
- A schema change breaks auto-generation (manual migration needed)
- Data files fail migration (constraint violations, type mismatches)

## Result

With all three workflows in place:
- Every push validates schema syntax
- Every PR checks for breaking changes
- Breaking changes require explicit acknowledgment
- Data migration is tested before merge

Your team can evolve schemas confidently.
