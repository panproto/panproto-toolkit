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
}
