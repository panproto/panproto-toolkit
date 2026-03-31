---
name: breaking-change-ci
description: >
  Set up breaking change detection for schema changes. Covers diff classification
  (fully compatible, backward compatible, breaking), CI integration, and PR gates.
---

# Breaking Change Detection

You are helping a user set up breaking change detection for their schemas. panproto classifies every schema change against the protocol's rules to determine compatibility.

## Compatibility levels

| Level | Meaning | Example |
|-------|---------|---------|
| **Fully compatible** | No consumers affected | Adding an optional field, adding a new enum value |
| **Backward compatible** | Existing consumers work, but new consumers may not work with old data | Widening a constraint (maxLength 100 to 300) |
| **Breaking** | Existing consumers may break | Removing a field, renaming a field, narrowing a constraint |

## Step 1: Diff two schemas

**CLI:**
```bash
schema diff --src old.json --tgt new.json
```

This produces a structural diff showing every vertex, edge, and constraint that changed.

**TypeScript:**
```typescript
const diff = p.diff(oldSchema, newSchema);
console.log(diff.added);    // new vertices/edges
console.log(diff.removed);  // deleted vertices/edges
console.log(diff.changed);  // modified constraints
```

**Python:**
```python
diff = panproto.diff_schemas(old_schema, new_schema)
print(diff.added)
print(diff.removed)
print(diff.changed)
```

## Step 2: Classify the change

Classification maps the diff against the protocol's compatibility rules:

**CLI:**
```bash
schema diff --src old.json --tgt new.json
# Output: structural diff with compatibility classification
```

**TypeScript:**
```typescript
const report = p.diffFull(oldSchema, newSchema);
console.log(report.level);       // 'compatible' | 'backward' | 'breaking'
console.log(report.issues);      // array of specific issues
console.log(report.reportText()); // human-readable summary
```

**Python:**
```python
report = panproto.diff_and_classify(old_schema, new_schema, proto)
print(report.compatible)       # True/False
print(report.report_text())    # human-readable summary
```

## Step 3: Add to CI

### GitHub Actions

Create `.github/workflows/schema-check.yml`:

```yaml
name: Schema Check
on:
  pull_request:
    paths:
      - 'schemas/**'

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
        run: |
          # Compare schemas between base and head
          git diff --name-only origin/${{ github.base_ref }}...HEAD -- schemas/ | while read file; do
            if git show origin/${{ github.base_ref }}:"$file" > /tmp/old.json 2>/dev/null; then
              result=$(schema diff --src /tmp/old.json --tgt "$file" 2>&1)
              echo "## $file" >> $GITHUB_STEP_SUMMARY
              echo "$result" >> $GITHUB_STEP_SUMMARY
              if echo "$result" | grep -q "breaking"; then
                echo "::error::Breaking change detected in $file"
                exit 1
              fi
            fi
          done

      - name: Post PR comment
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Breaking Schema Change Detected\n\nThis PR contains breaking schema changes. Add the `breaking-change-acknowledged` label to proceed.'
            })
```

### Override label

To allow intentional breaking changes, add a label check:
```yaml
      - name: Check override label
        if: failure()
        run: |
          if echo '${{ toJSON(github.event.pull_request.labels.*.name) }}' | grep -q 'breaking-change-acknowledged'; then
            echo "Breaking change acknowledged via label"
            exit 0
          fi
          exit 1
```

### Pre-commit hook

Add to `.pre-commit-config.yaml`:
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

## Step 4: Interpret reports

A classification report contains:
- **Level**: the overall compatibility level
- **Issues**: each specific incompatibility with:
  - The affected element (vertex, edge, or constraint)
  - The type of change (added, removed, modified)
  - Why it is breaking (based on the protocol's rules)
  - A suggested fix

Example report:
```
Breaking changes (2):
  - Removed vertex "post:body.legacyId" (string)
    Consumers reading this field will fail.
    Fix: keep the field and mark deprecated, or provide a migration.

  - Narrowed constraint on "post:body.text": maxLength 3000 → 1000
    Existing records with text > 1000 chars will fail validation.
    Fix: keep maxLength at 3000 or higher.

Backward-compatible changes (1):
  - Added optional vertex "post:body.tags" (array)
    New field; existing consumers unaffected.
```

## Further Reading

- [Tutorial Ch. 7: Breaking Changes and CI](https://panproto.dev/tutorial/chapters/07-breaking-changes-and-ci.html)
