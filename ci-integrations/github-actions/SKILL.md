---
name: ci-github-actions
description: >
  Generate GitHub Actions workflows for panproto schema validation, breaking change
  detection, and data migration checks in your project's CI pipeline.
argument-hint: "[check|gate|migrate]"
---

# GitHub Actions for panproto

You are helping a user add panproto checks to their GitHub Actions CI pipeline. Generate workflow files based on their needs.

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
        env:
          PROTOCOL: atproto  # change to your protocol
```

### 2. Breaking change gate on PRs (`gate`)

Blocks PRs with unacknowledged breaking schema changes:

```yaml
name: Breaking Change Gate
on:
  pull_request:
    paths: ['schemas/**']

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
          breaking=false
          report=""
          git diff --name-only origin/${{ github.base_ref }}...HEAD -- schemas/ | while read file; do
            if git show origin/${{ github.base_ref }}:"$file" > /tmp/old.json 2>/dev/null; then
              result=$(schema check --src /tmp/old.json --tgt "$file" 2>&1)
              report="$report\n## $file\n$result\n"
              if echo "$result" | grep -q "breaking"; then
                breaking=true
              fi
            fi
          done
          echo "breaking=$breaking" >> $GITHUB_OUTPUT
          echo -e "$report" >> $GITHUB_STEP_SUMMARY

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

Tests that data files can be migrated through schema changes:

```yaml
name: Data Migration Check
on:
  pull_request:
    paths: ['schemas/**']

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
          schema data migrate --dry-run data/ \
            --src-schema <(git show origin/${{ github.base_ref }}:schemas/main.json) \
            --tgt-schema schemas/main.json
```

## Customization

Ask the user:
1. Which protocol their schemas use
2. Where schema files live (default: `schemas/`)
3. Where data files live (if using migration checks)
4. Whether they want PR comments on breaking changes
5. Which workflow(s) they need

Write the workflow file(s) to `.github/workflows/` in their project.

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
