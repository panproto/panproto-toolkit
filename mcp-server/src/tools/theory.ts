import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerTheoryTools(server: McpServer): void {
  server.tool(
    "panproto_theory_validate",
    "Validate a theory document (load + typecheck)",
    {
      file: z.string().describe("Path to the theory document (.ncl, .json, .yaml)"),
    },
    withErrorBoundary(async ({ file }) => {
      const result = await execCli("theory", "validate", file);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_theory_compile",
    "Compile a theory document and return resulting theories, morphisms, and protocols",
    {
      file: z.string().describe("Path to the theory document"),
      json: z.boolean().optional().describe("Output as JSON"),
    },
    withErrorBoundary(async ({ file, json }) => {
      const args = ["theory", "compile"];
      if (json) args.push("--json");
      args.push(file);
      const result = await execCli(...args);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_theory_compile_dir",
    "Compile all theory documents in a directory",
    {
      dir: z.string().describe("Path to the directory of theory files"),
    },
    withErrorBoundary(async ({ dir }) => {
      const result = await execCli("theory", "compile-dir", dir);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_theory_check_morphism",
    "Validate a theory morphism document",
    {
      file: z.string().describe("Path to the morphism document"),
    },
    withErrorBoundary(async ({ file }) => {
      const result = await execCli("theory", "check-morphism", file);
      return textContent(result);
    })
  );

  server.tool(
    "panproto_theory_recompose",
    "Replay a composition and print the resulting theory",
    {
      file: z.string().describe("Path to the composition document"),
    },
    withErrorBoundary(async ({ file }) => {
      const result = await execCli("theory", "recompose", file);
      return textContent(result);
    })
  );
}
