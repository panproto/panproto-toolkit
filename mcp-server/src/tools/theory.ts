import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function theoryTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_theory_validate",
      config: {
        title: TOOL_CATALOG.panproto_theory_validate.title,
        description: "Validate a theory document (load + typecheck). Accepts documents containing theory, morphism, composition, protocol, class, instance, and inductive bodies. Typechecker enforces implicit argument inference, closed-sort coverage for case expressions, capture-avoiding let bindings, and definitional equality modulo directed rewrites.",
        inputSchema: z.object({
          file: z.string().describe("Path to the theory document (.ncl, .json, .yaml)"),
        }),
        annotations: TOOL_CATALOG.panproto_theory_validate.annotations,
      },
      handler: withErrorBoundary(async ({ file }) => {
        const result = await execCli("theory", "validate", file as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_theory_compile",
      config: {
        title: TOOL_CATALOG.panproto_theory_compile.title,
        description: "Compile a theory document and return resulting theories, morphisms, and protocols. Class bodies compile to theories; instance bodies compile to checked theory morphisms; inductive bodies expand to closed sorts plus constructor operations. Import specs with alias and selective expose are resolved at compile time.",
        inputSchema: z.object({
          file: z.string().describe("Path to the theory document"),
          json: z.boolean().optional().describe("Output as JSON"),
        }),
        annotations: TOOL_CATALOG.panproto_theory_compile.annotations,
      },
      handler: withErrorBoundary(async ({ file, json }) => {
        const args = ["theory", "compile"];
        if (json) args.push("--json");
        args.push(file as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
    {
      name: "panproto_theory_compile_dir",
      config: {
        title: TOOL_CATALOG.panproto_theory_compile_dir.title,
        description: "Compile all theory documents in a directory",
        inputSchema: z.object({
          dir: z.string().describe("Path to the directory of theory files"),
        }),
        annotations: TOOL_CATALOG.panproto_theory_compile_dir.annotations,
      },
      handler: withErrorBoundary(async ({ dir }) => {
        const result = await execCli("theory", "compile-dir", dir as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_theory_check_morphism",
      config: {
        title: TOOL_CATALOG.panproto_theory_check_morphism.title,
        description: "Validate a theory morphism document",
        inputSchema: z.object({
          file: z.string().describe("Path to the morphism document"),
        }),
        annotations: TOOL_CATALOG.panproto_theory_check_morphism.annotations,
      },
      handler: withErrorBoundary(async ({ file }) => {
        const result = await execCli("theory", "check-morphism", file as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_theory_recompose",
      config: {
        title: TOOL_CATALOG.panproto_theory_recompose.title,
        description: "Replay a composition and print the resulting theory",
        inputSchema: z.object({
          file: z.string().describe("Path to the composition document"),
        }),
        annotations: TOOL_CATALOG.panproto_theory_recompose.annotations,
      },
      handler: withErrorBoundary(async ({ file }) => {
        const result = await execCli("theory", "recompose", file as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_theory_check_coercion_laws",
      config: {
        title: TOOL_CATALOG.panproto_theory_check_coercion_laws.title,
        description: "Run sample-based coercion law verification on every directed equation in a theory document. Reports violations of declared Iso / Retraction / Projection / Opaque round-trip laws with serde-tagged kinds. Intended for CI gates against dishonest coercion declarations; exits non-zero on any violation.",
        inputSchema: z.object({
          file: z.string().describe("Path to the theory document (.ncl, .json, .yaml)"),
          var_name: z.string().optional().describe("Override the default 'x' binder used when evaluating equation expressions"),
          json: z.boolean().optional().describe("Emit machine-readable JSON report"),
        }),
        annotations: TOOL_CATALOG.panproto_theory_check_coercion_laws.annotations,
      },
      handler: withErrorBoundary(async ({ file, var_name, json }) => {
        const args = ["theory", "check-coercion-laws"];
        if (var_name) args.push("--var-name", var_name as string);
        if (json) args.push("--json");
        args.push(file as string);
        const result = await execCli(...args);
        return textContent(result);
      }),
    },
  ];
}
