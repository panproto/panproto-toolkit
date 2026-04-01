import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerParseTools(server: McpServer): void {
  server.tool(
    "panproto_parse_file",
    "Parse a source file into a panproto schema representation (248 languages supported via tree-sitter)",
    {
      file_path: z.string().describe("Path to the source file"),
    },
    withErrorBoundary(async ({ file_path }) => {
      const result = await execCli("parse", "file", file_path);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_parse_project",
    "Parse all files in a directory into a unified project schema with cross-file imports",
    {
      path: z.string().optional().describe("Directory to parse (default: current directory)"),
    },
    withErrorBoundary(async ({ path }) => {
      const args = ["parse", "project"];
      if (path) args.push(path);
      const result = await execCli(...args, { timeout: 120_000 });
      return textContent(result);
    })
  );

  server.tool(
    "panproto_parse_emit",
    "Round-trip parse and emit a source file (parse then reconstruct to verify fidelity)",
    {
      file_path: z.string().describe("Path to the source file"),
    },
    withErrorBoundary(async ({ file_path }) => {
      const result = await execCli("parse", "emit", file_path);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_parse_preserving",
    "Format-preserving parse: parse a data file (JSON, XML, YAML, TOML, CSV, TSV) through the unified tree-sitter codec, preserving all formatting (whitespace, key ordering, indentation, comments). Returns the instance and a CST complement for format-preserving re-emission. Requires the tree-sitter feature.",
    {
      file_path: z.string().describe("Path to the data file"),
      protocol: z.string().describe("Protocol name (e.g. openapi, atproto, geojson)"),
      schema: z.string().optional().describe("Path to domain schema (auto-detected if omitted)"),
      save_complement: z.string().optional().describe("Save CST complement to this path for later re-emission"),
    },
    withErrorBoundary(async ({ file_path, protocol, schema, save_complement }) => {
      const args = ["data", "parse", "--protocol", protocol, "--format-preserving"];
      if (schema) args.push("--schema", schema);
      if (save_complement) args.push("--save-complement", save_complement);
      args.push(file_path);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_emit_preserving",
    "Format-preserving emit: re-emit instance data using a CST complement to restore the original file formatting. The output is byte-identical to the original file for unmodified data.",
    {
      instance: z.string().describe("Path to instance data (MessagePack or JSON)"),
      complement: z.string().describe("Path to CST complement from format-preserving parse"),
      protocol: z.string().describe("Protocol name"),
      schema: z.string().optional().describe("Path to domain schema"),
      output: z.string().optional().describe("Output file path (default: stdout)"),
    },
    withErrorBoundary(async ({ instance, complement, protocol, schema, output }) => {
      const args = ["data", "emit", "--protocol", protocol, "--complement", complement];
      if (schema) args.push("--schema", schema);
      if (output) args.push("--output", output);
      args.push(instance);
      const result = await execCli(...args);
      return textContent(result);
    })
  );
}
