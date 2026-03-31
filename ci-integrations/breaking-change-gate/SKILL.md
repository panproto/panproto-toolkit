---
name: ci-breaking-gate
description: >
  Configure a CI gate that blocks PRs with breaking schema changes unless explicitly
  acknowledged. Works with GitHub Actions, GitLab CI, or any CI system.
---

# Breaking Change Gate

You are helping a user set up a CI gate that prevents accidental breaking schema changes from being merged.

## How it works

1. On every PR that modifies schema files, the gate compares each changed schema against the base branch version
2. `schema check` classifies each change as compatible, backward-compatible, or breaking
3. If any change is breaking, the gate blocks the PR
4. The team can override by adding a label (GitHub) or variable (GitLab) to acknowledge the break

## GitHub Actions

```yaml
name: Schema Breaking Change Gate
on:
  pull_request:
    paths: ['schemas/**', '*.schema.json', '*.avsc', '*.proto']

permissions:
  pull-requests: write
  contents: read

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install panproto CLI
        run: |
          curl --proto '=https' -LsSf \
            https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh

      - name: Analyze schema changes
        id: analyze
        run: |
          breaking_files=""
          backward_files=""
          compatible_files=""

          for file in $(git diff --name-only origin/${{ github.base_ref }}...HEAD -- schemas/); do
            if ! git show origin/${{ github.base_ref }}:"$file" > /tmp/base.json 2>/dev/null; then
              compatible_files="$compatible_files $file(new)"
              continue
            fi

            result=$(schema check --src /tmp/base.json --tgt "$file" --json 2>&1)
            level=$(echo "$result" | jq -r '.level // "compatible"')

            case "$level" in
              breaking) breaking_files="$breaking_files $file" ;;
              backward) backward_files="$backward_files $file" ;;
              *) compatible_files="$compatible_files $file" ;;
            esac
          done

          echo "breaking=$breaking_files" >> $GITHUB_OUTPUT
          echo "backward=$backward_files" >> $GITHUB_OUTPUT
          echo "compatible=$compatible_files" >> $GITHUB_OUTPUT

          # Build summary
          {
            echo "## Schema Compatibility Report"
            [ -n "$breaking_files" ] && echo "### Breaking" && echo "$breaking_files" | tr ' ' '\n' | sed 's/^/- /'
            [ -n "$backward_files" ] && echo "### Backward Compatible" && echo "$backward_files" | tr ' ' '\n' | sed 's/^/- /'
            [ -n "$compatible_files" ] && echo "### Fully Compatible" && echo "$compatible_files" | tr ' ' '\n' | sed 's/^/- /'
          } >> $GITHUB_STEP_SUMMARY

      - name: Gate decision
        if: steps.analyze.outputs.breaking != ''
        run: |
          labels='${{ toJSON(github.event.pull_request.labels.*.name) }}'
          if echo "$labels" | grep -q 'breaking-change-acknowledged'; then
            echo "Breaking change acknowledged."
            exit 0
          fi
          echo "::error::Breaking schema changes detected. Add 'breaking-change-acknowledged' label to merge."
          exit 1
```

## GitLab CI

```yaml
schema-gate:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - schemas/**
  script:
    - curl --proto '=https' -LsSf https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh
    - |
      breaking=false
      git diff --name-only origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME...HEAD -- schemas/ | while read file; do
        if git show origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME:"$file" > /tmp/base.json 2>/dev/null; then
          if schema check --src /tmp/base.json --tgt "$file" 2>&1 | grep -q "breaking"; then
            breaking=true
          fi
        fi
      done
      if [ "$breaking" = "true" ] && [ "$ALLOW_BREAKING_CHANGES" != "true" ]; then
        echo "Breaking schema changes detected. Set ALLOW_BREAKING_CHANGES=true to proceed."
        exit 1
      fi
```

## Generic CI (any system)

The gate logic reduces to a shell script:

```bash
#!/bin/bash
# schema-gate.sh <base-ref> <schema-dir>
set -e
BASE_REF="${1:-origin/main}"
SCHEMA_DIR="${2:-schemas}"

breaking=false
for file in $(git diff --name-only "$BASE_REF"...HEAD -- "$SCHEMA_DIR/"); do
  if git show "$BASE_REF":"$file" > /tmp/base.json 2>/dev/null; then
    if schema check --src /tmp/base.json --tgt "$file" 2>&1 | grep -q "breaking"; then
      echo "BREAKING: $file"
      breaking=true
    fi
  fi
done

if [ "$breaking" = "true" ]; then
  echo "Breaking schema changes detected."
  exit 1
fi
echo "All schema changes are compatible."
```

## Customization

Ask the user:
1. Which CI system (GitHub Actions, GitLab CI, CircleCI, Jenkins, other)
2. Where schema files live
3. What file patterns to watch
4. How to acknowledge breaking changes (label, env var, commit message tag)
5. Whether to post a PR comment with the compatibility report

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
