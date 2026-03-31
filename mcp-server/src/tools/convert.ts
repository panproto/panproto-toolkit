import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerConvertTools(server: McpServer): void {
  server.tool(
    "panproto_convert",
    "Convert data between protocols (e.g., Avro to JSON Schema)",
    {
      src_protocol: z.string().describe("Source protocol name"),
      tgt_protocol: z.string().describe("Target protocol name"),
      data: z.string().describe("Path to data file"),
      src_schema: z
        .string()
        .optional()
        .describe("Path to source schema (optional)"),
      tgt_schema: z
        .string()
        .optional()
        .describe("Path to target schema (optional)"),
    },
    async ({ src_protocol, tgt_protocol, data, src_schema, tgt_schema }) => {
      const args = [
        "data",
        "convert",
        "--src-protocol",
        src_protocol,
        "--tgt-protocol",
        tgt_protocol,
      ];
      if (src_schema) args.push("--src-schema", src_schema);
      if (tgt_schema) args.push("--tgt-schema", tgt_schema);
      args.push(data);
      const result = await execCli(...args);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_convert_schema",
    "Translate a schema between protocols",
    {
      src_protocol: z.string().describe("Source protocol name"),
      tgt_protocol: z.string().describe("Target protocol name"),
      schema: z.string().describe("Path to schema file"),
    },
    async ({ src_protocol, tgt_protocol, schema }) => {
      const result = await execCli(
        "data",
        "convert",
        "--src-protocol",
        src_protocol,
        "--tgt-protocol",
        tgt_protocol,
        "--schema-only",
        schema
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
