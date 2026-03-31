# Agents Guide

## What are agents?

Agents are specialized Claude Code sub-processes that handle focused analysis tasks. When Claude delegates to an agent, the agent runs in isolation with its own context, performs its analysis, and returns structured results.

## Available agents

### migration-advisor (Opus)

Analyzes two schema versions and recommends a migration strategy. The advisor:
- Computes the structural diff between schemas
- Classifies the change (compatible, backward-compatible, breaking)
- Attempts automatic lens generation
- If auto-generation fails, explains why and suggests manual combinator sequences
- Produces a step-by-step migration plan with CLI commands and SDK code

**When Claude uses it**: when you ask "how do I migrate from schema A to schema B?" or "what is the best migration strategy for this change?"

### compatibility-checker (Sonnet)

Checks whether schemas are compatible across protocol boundaries. The checker:
- Parses schemas from potentially different protocols into the universal representation
- Computes structural overlap
- Reports which constructs translate cleanly, which are approximated, and which are lost
- Tests migration feasibility in both directions

**When Claude uses it**: when you ask about cross-protocol compatibility or translation feasibility.

### data-converter (Sonnet)

Converts data between formats using the parse/migrate/emit pipeline. The converter:
- Runs the full conversion pipeline
- Validates output against the target schema
- Reports conversion fidelity (preserved, approximated, lost)
- Handles batch operations on directories

**When Claude uses it**: when you ask to convert data files between formats.

### schema-reviewer (Opus)

Reviews schema definitions for quality and best practices. The reviewer checks:
- Protocol-specific conventions (ATProto NSID patterns, Protobuf field numbering, SQL normalization)
- Constraint coverage (are required fields constrained? are string lengths bounded?)
- Migration-friendliness (are optional fields used where evolution is expected?)
- Naming consistency
- Graph structure quality

**When Claude uses it**: when you ask for a review of your schema or want to improve schema quality.

### vcs-assistant (Sonnet)

Guides schema version control workflows. The assistant helps with:
- Repository initialization and first commit
- Branching strategies for schema evolution
- Merge conflict resolution (explains pushout-based semantics)
- Schema history exploration and visualization
- Release tagging strategies

**When Claude uses it**: when you are working with panproto VCS operations and need guidance.

## Requesting a specific agent

You can ask Claude to use a specific agent:
- "Use the migration advisor to analyze these two schemas"
- "Have the schema reviewer check my schema"
- "Run the compatibility checker on these two formats"

## Agent output

Agents return structured analysis with sections like:
- **Summary**: one-line assessment
- **Critical Issues**: must-fix problems
- **Suggestions**: improvements to consider
- **Positives**: what is done well

The exact format varies by agent. Claude summarizes the results for you.
