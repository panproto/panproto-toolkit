---
name: schema-vcs
description: >
  Manage schema versioning with panproto's built-in VCS. Covers init, commit, branch,
  merge, diff, log, data versioning, and pushout-based merge semantics.
---

# Schema Version Control

You are helping a user manage schema versions with panproto's built-in VCS. It works like git, but operates on schema graphs instead of text, and merges are categorical pushouts (commutative and deterministic).

## Core concepts

- **Content-addressed store**: schemas are stored by their blake3 hash in `.panproto/objects/`
- **Per-file Merkle tree (0.38.0+)**: a commit no longer points at a monolithic schema object. It points at a `SchemaTreeObject`, which is either `SingleLeaf { file_schema_id }` (one file in the project) or `Directory { entries }` (a sorted list of `SchemaTreeEntry::{File, Tree}` pointing further down the tree). Each `FileSchemaObject` holds the parsed schema for one source file plus its `cross_file_edges` (edges whose target lives in a different file). Editing one file rehashes only that file's `FileSchemaObject` plus the directories on its path to the root; sibling files retain their hashes, so commits over a large project stay cheap.
- **Commit DAG**: commits form a directed acyclic graph with parent pointers. A 0.39.0 commit record (lexicon `dev.panproto.vcs.commit`) carries `objectHash` (the schema-tree root), `schemaHash` (the flat-schema digest), `protocolHash`, `theoryIds` (named hashes), `dataHashes`, `complementHashes`, `editLogHashes`, `cstComplementHashes`, `migrationHash`, `timestamp`, and `renames`.
- **Pushout merge**: merges are computed as categorical pushouts; no heuristic tie-breaking, the result is commutative (merge(A,B) = merge(B,A))
- **Data versioning**: instance data, complements, and protocol definitions are stored alongside schemas, each as their own content-addressed object kind (`dataSet`, `cstComplement`, `editLog`, `flatSchema`, `tag`).

### Walking the schema tree

Resolving the full schema for a commit means walking from the root `SchemaTreeObject` down to every `FileSchemaObject` and re-stitching the cross-file edges. The library exposes this as `panproto_vcs::resolve_commit_schema(&store, commit_id)`; the lexicon-level walker is `dev.panproto.node.getSchemaTree`. For per-file inspection without rebuilding the project schema, use `dev.panproto.node.getFileSchema`.

## Getting started

### Initialize a repository
```bash
schema init
# Creates .panproto/ directory
```

### Stage and commit schemas
```bash
schema add schemas/post.json
schema add schemas/profile.json
schema commit -m "initial schema definitions"
```

### Check status
```bash
schema status
# Shows staged, modified, and untracked schema files
```

## Branching and merging

### Create and switch branches
```bash
schema branch feature-new-fields
schema checkout feature-new-fields

# Or create and switch in one step
schema checkout -b feature-new-fields
```

### View branches
```bash
schema branch
# Lists all branches, marks the current one
```

### Merge
```bash
schema checkout main
schema merge feature-new-fields
```

Merges compute the categorical pushout of the two schema versions relative to their common ancestor. This means:
- No merge conflicts from ordering (merge is commutative)
- Structural conflicts are detected precisely (e.g., two branches rename the same field differently)
- The result is the "smallest" schema containing both sets of changes

### Handle structural conflicts
If the merge detects incompatible changes:
```bash
# The merge reports which elements conflict
schema merge feature-branch
# Error: Structural conflict on vertex "post:body.text"
#   Branch A: changed kind from string to integer
#   Branch B: added constraint maxLength=500

# Resolve by editing the schema, then:
schema add schemas/post.json
schema commit -m "resolve merge conflict"
```

## History exploration

### View commit log
```bash
schema log
# Shows commit hash, author, date, message, and schema summary
```

### Diff between versions
```bash
# Diff staged vs HEAD
schema diff --staged

# Diff between two commits
schema diff abc123 def456

# Theory-level diff (sorts and operations)
schema diff --theory old.json new.json
```

### Blame
```bash
schema blame schemas/post.json
# Shows which commit introduced each vertex and edge
```

### Bisect
```bash
schema bisect start
schema bisect bad HEAD
schema bisect good v1.0
# panproto binary-searches the commit history
# to find the commit that introduced a schema problem
```

## Data versioning

### Store data alongside schemas
```bash
schema data migrate records/
# Automatically generates lenses from schema history
# Applies them to data files
# Stores complements for backward migration
```

### Migrate data on checkout
```bash
schema checkout v2 --migrate
# Switches to v2 schema AND migrates data files
```

### Migrate data on merge
```bash
schema merge feature-branch --migrate
# Merges schemas AND migrates data files
```

### Check data staleness
```bash
schema data status records/
# Reports which records are behind the current schema version
```

### Backward migration
```bash
schema data migrate --backward records/
# Uses stored complements to reverse the migration
# No data loss because complements preserve everything get() discarded
```

## Tags and releases

```bash
# Create a tag
schema tag v1.0.0

# List tags
schema tag --list

# Checkout a tagged version
schema checkout v1.0.0
```

## Advanced operations

### Rebase
```bash
schema rebase main
# Replays current branch's commits on top of main
```

### Cherry-pick
```bash
schema cherry-pick abc123
# Apply a single commit from another branch
```

### Stash
```bash
schema stash
schema stash pop
```

### Reflog
```bash
schema reflog
# Shows all HEAD mutations (useful for recovering from mistakes)
```

### Garbage collection
```bash
schema gc
# Removes unreachable objects from the store
```

## Further Reading

- [Tutorial Ch. 10: Schema Version Control](https://panproto.dev/tutorial/chapters/10-schema-version-control.html)
- [Tutorial Ch. 19: Data Versioning](https://panproto.dev/tutorial/chapters/19-data-versioning.html)
