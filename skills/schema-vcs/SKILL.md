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

### A project keeps the protocol its files agree on (0.70.1+)

A multi-document project used to be assembled under an internal coproduct protocol named `project`, which carries no edge rules, object kinds or constraint sorts. Equation diagnostics are selected by protocol name, so a project whose every file was ATProto reported `no protocol theory registered for 'project'; schema equations were not checked` and was still marked valid: the protocol's theory was never consulted.

An assembled project now takes the protocol its files agree on, so a homogeneous project is checked against that protocol's theory and a violation blocks the commit instead of passing unexamined. The three cases are `Empty`, `Homogeneous(name)` and `Heterogeneous(names)`; a project that genuinely mixes protocols still has no single theory to check against and now says so, naming the protocols it mixes rather than the internal coproduct. `schema show` reports the project's own protocol as well.

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

`schema add` accepts a directory as well as a file. A parsed source project or a manifest-declared bundle protocol (an ATProto lexicon set with cross-file references, for instance) is staged through the per-file tree path (0.65.0+), so the tree root `ProjectBuilder` produced is retained in the index and the commit. A one-file edit therefore reuses every unchanged file object instead of realigning the whole schema; a changed file gets a new object id while its unchanged sibling keeps the old one. The SDK path is `Repository.add_project(project, skip_verify=False)`.

**Staging a long history (0.63.0+).** `add` runs GAT migration validation, a bounded model check, against HEAD on every staged schema. On an ~800-vertex schema that is minutes per `add`, which makes replaying a project's released versions in sequence impractical. `--skip-verify` still derives and records the migration but skips the validation and leaves the stage `Pending`, which a default `commit` treats as non-blocking:

```bash
schema add schemas/post.json --skip-verify
```
```python
repo.add(schema, skip_verify=True)          # or repo.add_project(project, skip_verify=True)
repo.commit("replay v1.2.0", "release-bot", skip_verify=True)
```

Use it only where each version was already validated at its own release.

### Stage data alongside a schema

```bash
schema add schemas/post.json --data records/
```

Every JSON file in the directory is staged, keyed by its source path, and the printed count reports what actually reached the index. Before 0.70.1 the command counted the files and printed `Staged N data file(s)` without handing any of them to the repository, so the following `commit` carried no data at all and the count was the only evidence anything had happened. Staging is all or nothing across the directory: if any file fails, the index is restored and the error names the file.

Staged data is stored opaquely and is **not** parsed or validated against the schema it is recorded under. A file that is not JSON at all, or one whose shape has nothing to do with the schema, is accepted and committed, and `record_count` reports 1 for anything that does not parse as a JSON array. Validate before staging if that matters to you.

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

Two-way integration is a different operation, and its signature moved in 0.71.0. `merge::integrate_schemas(left, right, protocol)` takes a protocol as its third parameter, because the overlap it discovers is an induced sub-schema and a schema is well formed only against a protocol; a failed overlap discovery now surfaces as `VcsError::NotImplemented` naming the reason rather than silently producing a square built on an empty overlap. `schema integrate` resolves the left schema's protocol on **both** paths, not only under `--auto-overlap`, and exits non-zero naming the protocol when it does not carry it.

The overlap itself is now the maximum common induced sub-schema, from a single span search on the `iso` path. It used to run the total-morphism search once per direction and keep whichever embedded more, so a pair where neither schema embeds wholly in the other came back as an empty overlap and the pushout merged the two as though they shared nothing. On the measured corpus that was the ordinary case.

An empty overlap means no common *induced* sub-schema, which is a narrower statement than it sounds: inducing carries every arc between the chosen vertices, so a single self-loop on the target side makes an otherwise shared vertex unshareable. It is not evidence that two schemas share nothing vertex by vertex.

A merged or normalized schema's adjacency order is now a function of its inputs (0.71.0). `schema_pushout` and `normalize` both rebuilt the three adjacency indices by iterating a `HashMap`, so `outgoing_edges`, `incoming_edges` and `edges_between` came back in a different order in every process. Anything reconstructing source text from a merged schema, or digesting one, now gets the same answer twice.

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
schema diff old.json new.json --theory

# Detect likely renames, and read the derived chain
schema diff old.json new.json --detect-renames --lens --save chain.json
```

### How the derived migration is built (0.71.0)

`derive_migration` reads a **span** rather than insisting on a total morphism. It used to fall back to `find_best_morphism` when the diff showed both removals and additions, so rename detection only helped when the pair happened to admit a total morphism, which a change that also dropped a field never does. It now takes the right leg of the optimal span, which covers as much of the old schema as it can. Detected renames pin the search rather than steering it, since they are correspondences the crate computed rather than guessed, and a pin now requires the two kinds to agree: a 0.4-confidence detection used to be able to rename an integer field onto a string one, which left the vertex with `⊥` as its only value and dropped it silently even where a kind-compatible target was available.

The span-derived migration is adopted only when it maps more vertices than the diff-derived one and the spliced result type-checks as a theory morphism. The apex is validated against a protocol naming exactly the kinds the old schema uses, which makes the validation a statement about the induction rather than about how well a guessed protocol describes the schema in hand.

An auto-derived migration never contracts, on vertices or on edges. The rename-recovery pass asks for an injective span: ranked by coverage alone, an ordinary edit that renamed one field and dropped its siblings derived a migration mapping every dropped field onto the survivor, and under `Sigma` the lift succeeded and reproduced each dropped field's data under the survivor's name. `SearchOptions::monic` promises injectivity on vertices and nothing more, so the derived edge map is separately pruned to be injective, keeping the name-matched image and leaving the loser unmapped. A contraction needs an explicit migration file, not a guess; renames are still recovered and drops stay drops.

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

### Read committed data at a revision (0.54.0+, SDK)

`Repository.data_at(ref)` resolves a branch, tag, or commit-id prefix and returns the data sets committed at that revision **without moving `HEAD`, the index, or the working tree**. It is the data counterpart to reading a committed schema, and the read-only contrast to `checkout --migrate` (which moves `HEAD` and migrates files in place). It is an SDK API, not a CLI command:

```python
sets = repo.data_at("v2")          # one dict per data set
for d in sets:
    # each dict carries schema_id, data, record_count, and key
    print(d["schema_id"], d["record_count"], d["key"], d["data"])
```

`Repository.add_data(path, key=None)` records a data set into the VCS. The optional `key` (0.56.0+) attaches a caller identifier to the set (a source path, an AT-URI, or any string) so `data_at` can map the committed set back to a downstream record; when `key` is `None` it falls back to the source path. The key is carried forward unchanged across data migration (forward, backward, and directory). It surfaces as the `key` field on each `data_at` dict:

```python
repo.add_data("records/")                     # key defaults to the source path
repo.add_data("records/post-1.json", key="at://did:plc:abc/app.bsky.feed.post/1")
```

Rust callers pass `None` for the previous behavior: `repo.add_data(path, None)`.

**Data-only and protocol-only commits (0.56.0+).** When no schema is staged, `Repository.commit` no longer raises `NothingStaged`. It builds a data-only or protocol-only commit that carries `HEAD`'s schema forward with no migration. This lets you re-record records of an already-committed type and then diff revisions by data alone.

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
