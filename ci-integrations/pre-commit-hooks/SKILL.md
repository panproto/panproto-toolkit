---
name: ci-pre-commit
description: >
  Set up pre-commit hooks for schema validation using the panproto CLI. Validates
  schemas on commit and optionally warns about breaking changes.
---

# Pre-commit Hooks for panproto

You are helping a user set up pre-commit hooks that validate schemas before each commit.

## Option 1: Using pre-commit framework

If the project uses [pre-commit](https://pre-commit.com/):

Create or update `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: panproto-validate
        name: Validate panproto schemas
        entry: schema validate --protocol atproto
        language: system
        files: ^schemas/.*\.json$
        pass_filenames: true

      - id: panproto-breaking-check
        name: Check for breaking schema changes
        entry: bash -c 'for f in "$@"; do
          if git show HEAD:"$f" > /tmp/old.json 2>/dev/null; then
            schema check --src /tmp/old.json --tgt "$f" || exit 1
          fi
        done' --
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
set -e

# Validate all staged schema files
staged=$(git diff --cached --name-only --diff-filter=ACM -- 'schemas/*.json')

if [ -z "$staged" ]; then
  exit 0
fi

echo "Validating schemas..."
for file in $staged; do
  schema validate --protocol atproto "$file"
  if [ $? -ne 0 ]; then
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

# Validate staged schema files
git diff --cached --name-only --diff-filter=ACM -- 'schemas/*.json' | while read file; do
  schema validate --protocol atproto "$file" || exit 1
done
```

## Customization

Ask the user:
1. Which hook framework they use (pre-commit, husky, plain git hooks, or none)
2. Which protocol their schemas use
3. Where schema files live
4. Whether to check for breaking changes (heavier, better on pre-push than pre-commit)

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
