# Tutorial Map

Each skill corresponds to specific chapters in the [panproto tutorial](https://panproto.dev/tutorial/) and [developer guide](https://panproto.dev/dev-guide/). Use this map to deepen your understanding after a skill gets you started.

## Skills to tutorial chapters

| Skill | Tutorial Chapters | Dev Guide Chapters |
|-------|-------------------|-------------------|
| getting-started | Ch. 1: The Schema Migration Problem, Ch. 4: Your First Migration | Ch. 1: Welcome |
| define-schema | Ch. 2: What Schemas Have in Common, Ch. 3: Protocols as Parameters | Ch. 7: Schema & Protocols |
| build-migration | Ch. 4: Your First Migration, Ch. 5: When Migrations Break | Ch. 9: Migration Engine |
| use-lenses | Ch. 6: Bidirectional Migration with Lenses, Ch. 16: Protolenses, Ch. 17: Automatic Lens Generation | Ch. 10: Lenses |
| protolenses | Ch. 16: Protolenses, Ch. 17: Automatic Lens Generation, Ch. 18: Symmetric Lenses | Ch. 26: Protolens Engine, Ch. 27: Auto-Lens Pipeline |
| breaking-change-ci | Ch. 7: Breaking Changes and CI | Ch. 11: Breaking Changes |
| convert-data | Ch. 8: Lifting Data, Ch. 11: Cross-Protocol Translation, Ch. 12: Names Across Protocol Boundaries | Ch. 9: Migration Engine |
| cross-protocol | Ch. 11: Cross-Protocol Translation, Ch. 12: Names Across Protocol Boundaries | Ch. 12: Protocols |
| schema-vcs | Ch. 10: Schema Version Control, Ch. 19: Data Versioning | Ch. 21: VCS Engine, Ch. 28: Data Versioning |
| query-instances | Ch. 21: Querying Instances | Ch. 29: Expression Engine |
| expression-language | Ch. 20: Value-Dependent Transforms, Ch. 21: Querying Instances | Ch. 29: Expression Engine |
| build-protocol | Ch. 9: Building Your Own Protocol, Ch. 14: Self-Description and Building Blocks | Ch. 6: GAT Engine, Ch. 12: Protocols |
| field-transforms | Ch. 20: Value-Dependent Transforms | Ch. 23: Field Transforms |
| full-ast-parsing | Ch. 24: Full-AST Parsing | Ch. 32: Parse Engine |
| sdk-typescript | Ch. 4: Your First Migration (TS examples) | Ch. 14: TypeScript SDK |
| sdk-python | Ch. 4: Your First Migration (Python examples) | Ch. 20: Python SDK |
| sdk-rust | Ch. 4: Your First Migration (Rust examples) | Ch. 16: Conventions |
| contributing | (all chapters as reference) | Ch. 1: Welcome, Ch. 2: First Contribution, Ch. 3: Building & Testing |

## Suggested learning paths

### Application developer (TypeScript)
1. `/panproto-getting-started ts` then Tutorial Ch. 1
2. `/panproto-define-schema atproto` then Tutorial Ch. 2, 3
3. `/panproto-build-migration` then Tutorial Ch. 4, 5
4. `/panproto-use-lenses` then Tutorial Ch. 6
5. `/panproto-breaking-change-ci` then Tutorial Ch. 7
6. `/panproto-sdk-typescript` (reference)

### Data engineer
1. `/panproto-getting-started python` then Tutorial Ch. 1
2. `/panproto-convert-data` then Tutorial Ch. 8, 11
3. `/panproto-cross-protocol` then Tutorial Ch. 12
4. `/panproto-query-instances` then Tutorial Ch. 21
5. `/panproto-expression-language` (reference)

### Schema architect
1. `/panproto-getting-started` then Tutorial Ch. 1
2. `/panproto-define-schema` then Tutorial Ch. 2, 3
3. `/panproto-schema-vcs` then Tutorial Ch. 10
4. `/panproto-protolenses` then Tutorial Ch. 16, 17, 18
5. `/panproto-build-protocol` then Tutorial Ch. 9, 14
6. `/panproto-full-ast-parsing` then Tutorial Ch. 24

### DevOps engineer
1. `/panproto-getting-started` then Tutorial Ch. 1
2. `/panproto-breaking-change-ci` then Tutorial Ch. 7
3. `/panproto-ci-github-actions`
4. `/panproto-ci-breaking-gate`
5. `/panproto-ci-pre-commit`
