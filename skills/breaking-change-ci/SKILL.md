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
schema diff old.json new.json
```

Both operands are positional. This produces a structural diff showing every vertex, edge, and constraint that changed.

**TypeScript:**
```typescript
const diff = p.diff(oldSchema, newSchema);
console.log(diff.compatibility);  // 'fully-compatible' | 'backward-compatible' | 'breaking'
console.log(diff.changes);        // SchemaChange[]

const full = p.diffFull(oldSchema, newSchema);
console.log(full.hasChanges);
console.log(full.data.added_vertices, full.data.removed_vertices, full.data.kind_changes);
```

`FullSchemaDiff` carries more than twenty change categories. Two of them changed shape in 0.71.0: `added_recursion_points` and `removed_recursion_points` are now `[string, RecursionPoint][]` pairs rather than bare `RecursionPoint`s, because `RecursionPoint::mu_id` is gone. The marker vertex is the key the point is filed under, and naming it twice made the two copies independently settable, which deserialisation could not rule out. A report still names the marker; it now reads it from the pair's first element.

**Python:**
```python
diff = panproto.diff_schemas(old_schema, new_schema)
print(diff.to_dict())              # the full diff as a dict
report = diff.classify(proto)      # -> CompatReport
```

`SchemaDiff` exposes `classify(protocol)` and `to_dict()` and nothing else. The `added_vertices` and `removed_vertices` attributes the type stub used to declare never existed on the extension and always raised `AttributeError`; the stub was corrected in 0.71.0 rather than the extension.

## Step 2: Classify the change

Classification maps the diff against the protocol's compatibility rules. `schema compat` is the command to reach for in CI, because it is the one with meaningful exit codes:

**CLI:**
```bash
schema compat old.json new.json --protocol atproto --format json
# exit 0: no breaking changes
# exit 1: at least one breaking change
# exit 2: usage or load error (unreadable file, unknown protocol, bad --format)
```

Each operand goes through a shared loader (0.70.1+) that accepts panproto's own serialized schema, a manifest-backed project directory (parsed as one bundle, so cross-document references resolve and the comparison sees the same assembled schema `schema add` stages), a directory with no manifest in the protocol named by `--protocol`, a single schema document, or a source tree. Comparing two versions of a lexicon project, which is the ordinary reason to run a compatibility check, was impossible before that: both operands were deserialized directly as panproto's internal JSON. A manifest is authoritative about its own protocol, so a `--protocol` that disagrees with it is a load error rather than a silent override.

**TypeScript:**
```typescript
const report = p.diffFull(oldSchema, newSchema).classify(protocol);
console.log(report.isBreaking);         // boolean
console.log(report.breakingChanges);    // BreakingChange[]
console.log(report.nonBreakingChanges); // NonBreakingChange[]
console.log(report.toText());           // human-readable summary
```

**Python:**
```python
report = panproto.diff_and_classify(old_schema, new_schema, proto)
print(report.classification)   # 'fully-compatible' | 'backward-compatible' | 'breaking'
print(report.compatible)       # True/False
print(report.breaking_changes)
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
          # Compare schemas between base and head. `schema compat` exits 0 on a
          # clean comparison, 1 on a breaking change, and 2 on a usage or load
          # error, so the gate reads the exit code rather than grepping prose.
          failed=0
          # Read the file list into a variable first: a `while read` on the far
          # side of a pipe runs in a subshell, so `failed=1` set inside it would
          # be discarded when the loop ends.
          changed=$(git diff --name-only "origin/${{ github.base_ref }}...HEAD" -- schemas/)
          for file in $changed; do
            git show "origin/${{ github.base_ref }}:$file" > /tmp/old.json 2>/dev/null || continue
            echo "## $file" >> "$GITHUB_STEP_SUMMARY"
            schema compat /tmp/old.json "$file" --protocol atproto --format json > /tmp/report.json
            case $? in
              0) echo "no breaking changes" >> "$GITHUB_STEP_SUMMARY" ;;
              1) echo "::error file=$file::Breaking schema change"
                 jq . /tmp/report.json >> "$GITHUB_STEP_SUMMARY"
                 failed=1 ;;
              *) echo "::error file=$file::schema compat could not read this pair"
                 failed=1 ;;
            esac
          done
          exit $failed

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
