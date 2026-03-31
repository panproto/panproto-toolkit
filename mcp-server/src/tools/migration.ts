import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerMigrationTools(server: McpServer): void {
  server.tool(
    "panproto_check_existence",
    "Check if a migration between two schemas is valid",
    {
      src_schema: z.string().describe("Path to source schema"),
      tgt_schema: z.string().describe("Path to target schema"),
      migration: z
        .string()
        .optional()
        .describe("Path to migration file (optional, auto-discovers if omitted)"),
    },
    async ({ src_schema, tgt_schema, migration }) => {
      const args = ["check", "--src", src_schema, "--tgt", tgt_schema];
      if (migration) args.push("--mapping", migration);
      const result = await execCli(...args);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_compile",
    "Compile a migration for fast per-record application",
    {
      src_schema: z.string().describe("Path to source schema"),
      tgt_schema: z.string().describe("Path to target schema"),
      migration: z.string().describe("Path to migration file"),
    },
    async ({ src_schema, tgt_schema, migration }) => {
      const result = await execCli(
        "check",
        "--src",
        src_schema,
        "--tgt",
        tgt_schema,
        "--mapping",
        migration,
        "--compile"
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_lift",
    "Apply a compiled migration to a data record",
    {
      migration: z.string().describe("Path to migration file"),
      src_schema: z.string().describe("Path to source schema"),
      tgt_schema: z.string().describe("Path to target schema"),
      record: z.string().describe("Path to the data record"),
    },
    async ({ migration, src_schema, tgt_schema, record }) => {
      const result = await execCli(
        "lift",
        "--migration",
        migration,
        "--src-schema",
        src_schema,
        "--tgt-schema",
        tgt_schema,
        record
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
