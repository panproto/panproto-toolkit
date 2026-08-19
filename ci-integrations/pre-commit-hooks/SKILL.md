---
name: ci-pre-commit
description: >
  Set up pre-commit hooks for schema validation using the panproto CLI. Validates
  schemas on commit and optionally warns about breaking changes.
---

# Pre-commit Hooks for panproto

You are helping a user set up pre-commit hooks that validate schemas before each commit.

Two facts shape every hook below. `schema validate` takes exactly one schema path, so a framework that batches filenames has to loop rather than pass them all at once. And the compatibility check is `schema compat <old> <new> --protocol <name>`, which exits `0` for no breaking changes, `1` for at least one, and `2` for a usage or load error; `schema check` is a different command that verifies a migration mapping and requires `--mapping`.

## Option 1: Using pre-commit framework

If the project uses [pre-commit](https://pre-commit.com/):

Create or update `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: panproto-validate
        name: Validate panproto schemas
        entry: bash -c 'for f in "$@"; do schema validate --protocol atproto "$f" || exit 1; done' --
        language: system
        files: ^schemas/.*\.json$
        pass_filenames: true

      - id: panproto-breaking-check
        name: Check for breaking schema changes
        entry: bash -c 'for f in "$@"; do if git show HEAD:"$f" > /tmp/old.json 2>/dev/null; then schema compat /tmp/old.json "$f" --protocol atproto || exit 1; fi; done' --
        language: system
        files: ^schemas/.*\.json$
        pass_filenames: true
        stages: [pre-push]  # only on push, not every commit
```

Install:
```bash
pip install pre-commit
pre-commit install
pre-commit install --hook-type pre-push  # for breaking change checks
```

## Option 2: Plain git hooks

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
set -euo pipefail

# Validate all staged schema files
staged=$(git diff --cached --name-only --diff-filter=ACM -- 'schemas/*.json')

if [ -z "$staged" ]; then
  exit 0
fi

echo "Validating schemas..."
for file in $staged; do
  if ! schema validate --protocol atproto "$file"; then
    echo "Schema validation failed for $file"
    exit 1
  fi
done

echo "All schemas valid."
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Option 3: Husky (Node.js projects)

```bash
npx husky init
```

Add to `.husky/pre-commit`:
```bash
#!/bin/sh

# Validate staged schema files. The status is collected across the loop
# rather than returned from inside it, so one bad file does not hide the
# rest of the report.
failed=0
for file in $(git diff --cached --name-only --diff-filter=ACM -- 'schemas/*.json'); do
  schema validate --protocol atproto "$file" || failed=1
done
exit $failed
```

## Checking a multi-document project

A lexicon set is one schema, not a pile of them: references across documents resolve only when the set is parsed as a bundle. For a project like that, drop the per-file loop and hand `schema compat` the two directories, which is an operand shape it accepts alongside a single file:

```bash
#!/bin/bash
set -euo pipefail

git worktree add --detach /tmp/panproto-head HEAD >/dev/null
trap 'git worktree remove --force /tmp/panproto-head' EXIT

set +e
schema compat /tmp/panproto-head/schemas schemas --protocol atproto
status=$?
set -e

case "$status" in
  0) echo "No breaking changes." ;;
  1) echo "Breaking schema changes staged."; exit 1 ;;
  *) echo "schema compat could not read the pair."; exit 2 ;;
esac
```

A `panproto.toml` manifest is authoritative about its own protocol, so `--protocol` has to agree with it; a disagreement is exit `2` rather than a silent override.

## Customization

Ask the user:
1. Which hook framework they use (pre-commit, husky, plain git hooks, or none)
2. Which protocol their schemas use
3. Where schema files live, and whether they form one project or a set of independent schemas
4. Whether to check for breaking changes (heavier, better on pre-push than pre-commit)

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
