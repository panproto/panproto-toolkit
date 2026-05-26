import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "migration-plan",
    "Generate a structured prompt for planning a schema migration",
    {
      src_path: z.string().describe("Path to source schema"),
      tgt_path: z.string().describe("Path to target schema"),
    },
    async ({ src_path, tgt_path }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need to migrate from schema "${src_path}" to schema "${tgt_path}".

Please:
1. Run \`schema diff --src "${src_path}" --tgt "${tgt_path}"\` to see what changed
2. Run \`schema check --src "${src_path}" --tgt "${tgt_path}"\` to classify compatibility
3. Attempt auto-generation with \`schema lens generate "${src_path}" "${tgt_path}"\`
4. If auto-generation fails, recommend a manual combinator sequence
5. Provide a step-by-step migration plan with CLI commands
6. Suggest how to verify the migration with lens law checks`,
          },
        },
      ],
    })
  );

  server.prompt(
    "schema-review",
    "Generate a structured prompt for reviewing a schema",
    {
      schema_path: z.string().describe("Path to schema file"),
      protocol: z.string().describe("Protocol name"),
    },
    async ({ schema_path, protocol }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Please review the schema at "${schema_path}" (protocol: ${protocol}).

Check for:
1. Validation: run \`schema validate --protocol ${protocol} "${schema_path}"\`
2. Constraint coverage: are critical fields properly constrained?
3. Naming conventions: do names follow ${protocol} conventions?
4. Migration-friendliness: will this schema be easy to evolve?
5. Protocol-specific best practices

Provide a structured review with Critical Issues, Suggestions, and Positives.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "compatibility-report",
    "Generate a prompt for cross-protocol compatibility analysis",
    {
      schema_a_path: z.string().describe("Path to first schema"),
      schema_b_path: z.string().describe("Path to second schema"),
    },
    async ({ schema_a_path, schema_b_path }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze the compatibility between schemas "${schema_a_path}" and "${schema_b_path}".

These may be different versions of the same schema, or schemas in different protocols.

Please:
1. Identify the protocol of each schema
2. Run \`schema diff --src "${schema_a_path}" --tgt "${schema_b_path}"\`
3. Classify the change (compatible, backward-compatible, breaking)
4. If cross-protocol, analyze what is preserved, approximated, and lost
5. Test bidirectional migration feasibility
6. Produce a compatibility matrix`,
          },
        },
      ],
    })
  );

  server.prompt(
    "vcs-workflow",
    "Guide through a schema version control workflow: init, add, commit, branch, merge",
    {
      project_path: z.string().describe("Path to the project directory"),
      protocol: z.string().describe("Protocol name for the schemas"),
    },
    async ({ project_path, protocol }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I want to set up schema version control for the project at "${project_path}" using the ${protocol} protocol.

Please guide me through:
1. Initialize a panproto repository: \`schema init "${project_path}"\`
2. Stage the current schema: \`schema add <schema_file>\`
3. Create an initial commit: \`schema commit -m "initial schema"\`
4. Show the repository status: \`schema status\`
5. Create a feature branch for schema evolution: \`schema branch feature/v2\`
6. After making schema changes, show the diff: \`schema diff --staged\`
7. Commit the changes and merge back: \`schema merge feature/v2\`

At each step, explain what panproto is doing (content-addressed objects, Merkle tree, pushout-based merge).`,
          },
        },
      ],
    })
  );

  server.prompt(
    "cross-protocol-translation",
    "Translate data between two different protocols via panproto's universal schema graph",
    {
      source_data: z.string().describe("Path to source data file"),
      source_protocol: z.string().describe("Source protocol name"),
      target_protocol: z.string().describe("Target protocol name"),
    },
    async ({ source_data, source_protocol, target_protocol }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need to translate data from ${source_protocol} to ${target_protocol}.

Source data is at "${source_data}".

Please:
1. Parse the source data: \`schema parse file "${source_data}"\` (or use the protocol codec)
2. Identify the structural overlap between ${source_protocol} and ${target_protocol} theories
3. Auto-discover a migration: \`schema auto-migrate\` between the schemas
4. Analyze what is preserved, approximated, and lost in the translation
5. Generate a protolens chain for the conversion
6. Apply the conversion: \`schema data convert\`
7. Verify the result with lens law checks`,
          },
        },
      ],
    })
  );

  server.prompt(
    "code-schema-diff",
    "Parse two source files, diff their schemas, and generate a lens for the transformation",
    {
      old_file: z.string().describe("Path to the old/original source file"),
      new_file: z.string().describe("Path to the new/modified source file"),
    },
    async ({ old_file, new_file }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I want to understand the structural difference between "${old_file}" and "${new_file}" at the schema level.

Please:
1. Parse both files into panproto schemas:
   \`schema parse file "${old_file}"\`
   \`schema parse file "${new_file}"\`
2. Diff the schemas: \`schema diff\` between the two parsed schemas
3. Classify the change: is it compatible, backward-compatible, or breaking?
4. Auto-generate a lens: \`schema lens generate\` between the schemas
5. Inspect the lens chain: what optic kinds (Iso, Lens, Prism, Traversal) are involved?
6. If possible, verify round-trip fidelity via parse → emit

The parse/decorate/emit lens (v0.48.0+) guarantees structural equivalence modulo vertex-id renaming.`,
          },
        },
      ],
    })
  );
}
