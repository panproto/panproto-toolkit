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
2. `schema compat <old> <new> --protocol <name>` runs a structural diff, classifies it against the protocol, and terminates with a status code the gate reads
3. If any comparison exits `1`, the gate blocks the PR
4. The team can override by adding a label (GitHub) or variable (GitLab) to acknowledge the break

## What `schema compat` accepts and returns

Exit codes, which are the whole interface a gate needs:

| Code | Meaning |
| --- | --- |
| `0` | No breaking changes |
| `1` | At least one breaking change |
| `2` | A usage or load error: unreadable operand, unknown protocol, bad `--format`, or a `--protocol` that disagrees with the project's manifest |

Each operand goes through one shared loader, so either side may be:

- a JSON file holding panproto's own serialized schema;
- a single schema document in a protocol's surface syntax;
- a manifest-backed project directory, parsed as one bundle so references across documents resolve to the real target vertex rather than an opaque placeholder;
- a directory with no manifest, parsed as a bundle in the protocol `--protocol` names;
- a source tree, parsed file by file.

The project-directory case is the one to reach for on a lexicon set: comparing two versions of a multi-document project file by file compares each document against a copy that cannot see its siblings, and a cross-document reference resolves to a placeholder on both sides. Handing the two directories over compares the same assembled schema `schema add` would stage.

A manifest is authoritative about its own protocol, so `--protocol` must agree with it; a disagreement is exit `2` rather than a silent override. `--protocol` also selects the classifier, and the CLI resolves `atproto`; the other 53 built-ins are reachable through the SDKs.

`--format json` writes `compatible`, `classification` (`fully-compatible`, `backward-compatible`, or `breaking`), `breaking`, `non_breaking`, `breaking_count`, and `non_breaking_count`.

## GitHub Actions

```yaml
name: Schema Breaking Change Gate
on:
  pull_request:
    paths: ['schemas/**', '*.schema.json', '*.avsc', '*.proto']

permissions:
  pull-requests: write
  contents: read

env:
  PROTOCOL: atproto

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
          compatible_files=""

          for file in $(git diff --name-only origin/${{ github.base_ref }}...HEAD -- schemas/); do
            if ! git show origin/${{ github.base_ref }}:"$file" > /tmp/base.json 2>/dev/null; then
              compatible_files="$compatible_files $file(new)"
              continue
            fi

            set +e
            schema compat /tmp/base.json "$file" --protocol "$PROTOCOL" > /tmp/report.txt 2>&1
            status=$?
            set -e

            case "$status" in
              0) compatible_files="$compatible_files $file" ;;
              1) breaking_files="$breaking_files $file" ;;
              *)
                echo "::error file=$file::schema compat could not read this pair"
                cat /tmp/report.txt
                exit 2
                ;;
            esac
          done

          echo "breaking=$breaking_files" >> $GITHUB_OUTPUT

          {
            echo "## Schema Compatibility Report"
            [ -n "$breaking_files" ] && echo "### Breaking" && echo "$breaking_files" | tr ' ' '\n' | sed 's/^/- /'
            [ -n "$compatible_files" ] && echo "### Compatible" && echo "$compatible_files" | tr ' ' '\n' | sed 's/^/- /'
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

### Gating the project as a whole

For a lexicon set or any other multi-document project, check the directory out at both revisions and compare the two directories once:

```yaml
      - name: Compare the project against the base branch
        id: analyze
        run: |
          git worktree add --detach /tmp/base origin/${{ github.base_ref }}
          set +e
          schema compat /tmp/base/schemas schemas --protocol "$PROTOCOL" | tee /tmp/report.txt
          status=${PIPESTATUS[0]}
          set -e
          cat /tmp/report.txt >> $GITHUB_STEP_SUMMARY
          case "$status" in
            0) echo "breaking=" >> $GITHUB_OUTPUT ;;
            1) echo "breaking=schemas" >> $GITHUB_OUTPUT ;;
            *) echo "::error::schema compat could not read the pair"; exit 2 ;;
          esac
```

The `Gate decision` step above reads `steps.analyze.outputs.breaking`, so this
step replaces `Analyze schema changes` rather than sitting beside it.

## GitLab CI

```yaml
schema-gate:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - schemas/**
  variables:
    PROTOCOL: atproto
  script:
    - curl --proto '=https' -LsSf https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh
    - git worktree add /tmp/base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME
    - |
      set +e
      schema compat /tmp/base/schemas schemas --protocol "$PROTOCOL"
      status=$?
      set -e
      if [ "$status" -eq 2 ]; then
        echo "schema compat could not read the pair."
        exit 2
      fi
      if [ "$status" -eq 1 ] && [ "$ALLOW_BREAKING_CHANGES" != "true" ]; then
        echo "Breaking schema changes detected. Set ALLOW_BREAKING_CHANGES=true to proceed."
        exit 1
      fi
```

## Generic CI (any system)

The gate logic reduces to a shell script:

```bash
#!/bin/bash
# schema-gate.sh <base-ref> <schema-dir> <protocol>
set -euo pipefail
BASE_REF="${1:-origin/main}"
SCHEMA_DIR="${2:-schemas}"
PROTOCOL="${3:-atproto}"

WORKTREE="$(mktemp -d)"
git worktree add --detach "$WORKTREE" "$BASE_REF" >/dev/null
trap 'git worktree remove --force "$WORKTREE"' EXIT

set +e
schema compat "$WORKTREE/$SCHEMA_DIR" "$SCHEMA_DIR" --protocol "$PROTOCOL"
status=$?
set -e

case "$status" in
  0) echo "All schema changes are compatible." ;;
  1) echo "Breaking schema changes detected."; exit 1 ;;
  *) echo "schema compat could not read the pair."; exit 2 ;;
esac
```

## Customization

Ask the user:
1. Which CI system (GitHub Actions, GitLab CI, CircleCI, Jenkins, other)
2. Where schema files live, and whether they form one project or a set of independent schemas
3. What file patterns to watch
4. How to acknowledge breaking changes (label, env var, commit message tag)
5. Whether to post a PR comment with the compatibility report

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
