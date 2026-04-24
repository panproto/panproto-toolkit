import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";

export function registerTheoryTools(server: McpServer): void {
  server.tool(
    "panproto_theory_validate",
    "Validate a theory document (load + typecheck). Accepts documents containing theory, morphism, composition, protocol, class, instance, and inductive bodies (0.37.0+). Typechecker enforces implicit argument inference, closed-sort coverage for case expressions, capture-avoiding let bindings, and definitional equality modulo directed rewrites.",
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
    "Compile a theory document and return resulting theories, morphisms, and protocols. Class bodies compile to theories; instance bodies compile to checked theory morphisms; inductive bodies expand to closed sorts plus constructor operations (0.37.0+). Import specs with alias and selective expose are resolved at compile time.",
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

  server.tool(
    "panproto_theory_check_coercion_laws",
    "Run sample-based coercion law verification on every directed equation in a theory document (0.38.0+). Reports violations of declared Iso / Retraction / Projection / Opaque round-trip laws with serde-tagged kinds (Backward, Forward, NonDeterministic, MissingInverse, ForwardEvalError, InverseEvalError, UnknownClass). Intended for CI gates against dishonest coercion declarations; exits non-zero on any violation.",
    {
      file: z.string().describe("Path to the theory document (.ncl, .json, .yaml)"),
      var_name: z.string().optional().describe("Override the default 'x' binder used when evaluating equation expressions"),
      json: z.boolean().optional().describe("Emit machine-readable JSON report"),
    },
    withErrorBoundary(async ({ file, var_name, json }) => {
      const args = ["theory", "check-coercion-laws"];
      if (var_name) {
        args.push("--var-name", var_name);
      }
      if (json) {
        args.push("--json");
      }
      args.push(file);
      const result = await execCli(...args);
      return textContent(result);
    })
  );
}
