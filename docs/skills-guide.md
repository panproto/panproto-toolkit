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
These skills provide comprehensive reference material: `expression-language`, `sdk-typescript`, `sdk-python`, `sdk-rust`.

### CI skills (set up automation)
These skills generate configuration files: `ci-github-actions`, `ci-pre-commit`, `ci-breaking-gate`.

## Tips

- Skills show examples in all three SDKs (TypeScript, Python, Rust) plus the CLI. Focus on the one relevant to your project.
- Every skill has a "Further Reading" section linking to the tutorial and dev-guide. Follow these links to understand the theory behind what the skill does.
- If a skill's guidance does not match your situation, tell Claude what is different. Skills provide the starting point; Claude adapts from there.
