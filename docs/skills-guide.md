# Skills Guide

## What are skills?

Skills are Claude Code instructions that teach Claude how to help you with specific panproto tasks. When you invoke a skill with `/panproto-<name>`, Claude reads the skill definition and follows its guidance to assist you.

Skills do not run code directly. They give Claude the context it needs to run the right CLI commands, write the right SDK code, and explain the right concepts for your situation.

## How to use skills

### Invocation

Type `/panproto-<name>` in Claude Code:
```
/panproto-getting-started ts
/panproto-define-schema atproto
/panproto-build-migration
```

Some skills accept arguments (shown after the skill name). Others work interactively, asking you questions as they go.

### Composing skills

Skills work well together. A typical session might look like:

1. `/panproto-getting-started ts` to scaffold a project
2. `/panproto-define-schema atproto` to define your first schema
3. Manually edit the schema, then come back
4. `/panproto-build-migration` to migrate between your old and new schema
5. `/panproto-breaking-change-ci` to add CI protection

### Skills vs. agents

Skills run in the main Claude Code conversation. They guide Claude's behavior but Claude still talks to you directly.

Agents are separate sub-processes that Claude can delegate to. They run in isolation, do focused work (like analyzing schemas or converting data), and return results to Claude. Agents are invoked automatically when Claude determines they would help, or you can ask Claude to use a specific agent.

## Skill categories

### Workflow skills (do things)
These skills walk you through a specific workflow: `getting-started`, `build-migration`, `convert-data`, `schema-vcs`.

### Reference skills (look things up)
These skills provide comprehensive reference material: `expression-language`, `sdk-typescript`, `sdk-python`, `sdk-rust`, `sdk-haskell`.

### CI skills (set up automation)
These skills generate configuration files: `github-actions`, `pre-commit-hooks`, `breaking-change-gate`. They live in `ci-integrations/` rather than `skills/`, and the installer symlinks them alongside the rest, so they are invoked the same way: `/panproto-github-actions`, `/panproto-pre-commit-hooks`, `/panproto-breaking-change-gate`.

## Tips

- Skills show examples across the SDKs (TypeScript, Python, Rust, and Haskell at full parity as of v0.55.0) plus the CLI. Focus on the one relevant to your project.
- Every skill has a "Further Reading" section linking to the tutorial and dev-guide. Follow these links to understand the theory behind what the skill does.
- If a skill's guidance does not match your situation, tell Claude what is different. Skills provide the starting point; Claude adapts from there.
- panproto v0.70.0 added a Swift SDK (`bindings/swift`), which the toolkit does not yet carry a skill for. Until it does, read the Swift SDK reference in the panproto book and use `/panproto-sdk-haskell` for the shape of the C ABI surface both bindings consume.
