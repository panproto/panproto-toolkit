---
name: ci-github-actions
description: >
  Generate GitHub Actions workflows for panproto schema validation, breaking change
  detection, and data migration checks in your project's CI pipeline.
argument-hint: "[check|gate|migrate]"
---

# GitHub Actions for panproto

You are helping a user add panproto checks to their GitHub Actions CI pipeline. Generate workflow files based on their needs.

## What each command reads

- `schema validate --protocol <name> <file>` reads panproto's own serialized schema JSON, which is what `Schema.to_json()` (Python), `schema.toJson()` (TypeScript), and `serde_json::to_string(&schema)` (Rust) write.
- `schema compat <old> <new> --protocol <name>` and `schema diff <old> <new>` take their operands positionally and go through one shared loader, so either side may be serialized schema JSON, a single schema document, a manifest-backed project directory, a directory with no manifest in the protocol `--protocol` names, or a source tree.
- `schema auto-migrate <old> <new>` reads serialized schema JSON on both sides and resolves the protocol the old schema names.
- `--protocol` selects the classifier, and the CLI resolves `atproto`. The other 53 built-ins are reachable through the SDKs.

## Available workflow templates

### 1. Schema validation on push (`check`)

Validates all schema files on every push:

```yaml
name: Schema Check
on:
  push:
    paths: ['schemas/**']
  pull_request:
    paths: ['schemas/**']

env:
  PROTOCOL: atproto

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install panproto CLI
        run: |
          curl --proto '=https' -LsSf \
            https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh

      - name: Validate schemas
        run: |
          for file in schemas/*.json; do
            echo "Validating $file..."
            schema validate --protocol "$PROTOCOL" "$file"
          done
```

### 2. Breaking change gate on PRs (`gate`)

Blocks PRs with unacknowledged breaking schema changes. The gate reads `schema compat`'s exit code rather than grepping its text: `0` no breaking changes, `1` at least one, `2` a usage or load error.

```yaml
name: Breaking Change Gate
on:
  pull_request:
    paths: ['schemas/**']

permissions:
  pull-requests: write
  contents: read

env:
  PROTOCOL: atproto

jobs:
  breaking-change-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install panproto CLI
        run: |
          curl --proto '=https' -LsSf \
            https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh

      - name: Check for breaking changes
        id: check
        run: |
          # One comparison over the whole project, so that references across
          # documents resolve on both sides. Comparing a multi-document
          # project file by file compares each document against a copy that
          # cannot see its siblings.
          git worktree add --detach /tmp/base origin/${{ github.base_ref }}

          set +e
          schema compat /tmp/base/schemas schemas --protocol "$PROTOCOL" | tee /tmp/report.txt
          status=${PIPESTATUS[0]}
          set -e

          cat /tmp/report.txt >> $GITHUB_STEP_SUMMARY
          case "$status" in
            0) echo "breaking=false" >> $GITHUB_OUTPUT ;;
            1) echo "breaking=true" >> $GITHUB_OUTPUT ;;
            *) echo "::error::schema compat could not read the pair"; exit 2 ;;
          esac

      - name: Check override label
        if: steps.check.outputs.breaking == 'true'
        run: |
          labels='${{ toJSON(github.event.pull_request.labels.*.name) }}'
          if echo "$labels" | grep -q 'breaking-change-acknowledged'; then
            echo "Breaking change acknowledged via label."
          else
            echo "::error::Breaking schema change detected. Add the 'breaking-change-acknowledged' label to proceed."
            exit 1
          fi

      - name: Post PR comment
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Breaking Schema Change Detected\n\nThis PR modifies schemas in a breaking way. Review the job summary for details.\n\nTo proceed, add the `breaking-change-acknowledged` label.'
            })
```

### 3. Data migration dry-run (`migrate`)

Tests that data files can be migrated through schema changes. `schema data convert` needs no repository: it auto-generates a lens between the two schemas and runs every record through it. A record the lens cannot carry is counted as skipped rather than aborting the run, so the skipped count is what a gate reads.

```yaml
name: Data Migration Check
on:
  pull_request:
    paths: ['schemas/**']

env:
  PROTOCOL: atproto

jobs:
  migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install panproto CLI
        run: |
          curl --proto '=https' -LsSf \
            https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh

      - name: Dry-run data migration
        run: |
          git show origin/${{ github.base_ref }}:schemas/main.json > /tmp/base.json

          set +e
          schema data convert data/ \
            --from /tmp/base.json \
            --to schemas/main.json \
            --protocol "$PROTOCOL" \
            -o /tmp/migrated 2>&1 | tee migration-report.txt
          status=${PIPESTATUS[0]}
          set -e

          [ "$status" -eq 0 ] || { echo "::error::schema data convert failed."; exit 1; }
          if grep -qE '[1-9][0-9]* skipped' migration-report.txt; then
            echo "::error::Some records could not be migrated. See output above."
            exit 1
          fi
```

To ask only whether a migration is findable at all, without touching data, use `schema auto-migrate <old> <new>`. It runs the span search, which never refuses for want of a match: it reports how much of the old schema the new one covers and the interval the search proved the quality lies in, and exits non-zero only when the two schemas share nothing. Add `--total` to require a morphism covering every vertex of the old schema.

## Customization

Ask the user:
1. Which protocol their schemas use
2. Where schema files live (default: `schemas/`), and whether they form one project or a set of independent schemas
3. Where data files live (if using migration checks)
4. Whether they want PR comments on breaking changes
5. Which workflow(s) they need

Write the workflow file(s) to `.github/workflows/` in their project.

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
