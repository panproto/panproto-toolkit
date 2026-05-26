import { z } from "zod";
import { execCli, textContent, withErrorBoundary } from "../cli.js";
import type { ToolDefinition } from "./types.js";
import { TOOL_CATALOG } from "../policy/tool-catalog.js";

export function enrichTools(): ToolDefinition[] {
  return [
    {
      name: "panproto_enrich_add_default",
      config: {
        title: TOOL_CATALOG.panproto_enrich_add_default.title,
        description: "Add a default value expression to a schema vertex, used when forward migration encounters a missing value",
        inputSchema: z.object({
          vertex: z.string().describe("Vertex ID to add the default to"),
          expr: z.string().describe("Default value expression as JSON"),
        }),
        annotations: TOOL_CATALOG.panproto_enrich_add_default.annotations,
      },
      handler: withErrorBoundary(async ({ vertex, expr }) => {
        const result = await execCli("enrich", "add-default", vertex as string, "--expr", expr as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_enrich_add_coercion",
      config: {
        title: TOOL_CATALOG.panproto_enrich_add_coercion.title,
        description: "Add a coercion expression between two vertex kinds with CoercionClass (Iso, Retraction, Projection)",
        inputSchema: z.object({
          from: z.string().describe("Source vertex kind"),
          to: z.string().describe("Target vertex kind"),
          expr: z.string().describe("Coercion expression as JSON"),
        }),
        annotations: TOOL_CATALOG.panproto_enrich_add_coercion.annotations,
      },
      handler: withErrorBoundary(async ({ from, to, expr }) => {
        const result = await execCli("enrich", "add-coercion", from as string, to as string, "--expr", expr as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_enrich_add_merger",
      config: {
        title: TOOL_CATALOG.panproto_enrich_add_merger.title,
        description: "Add a merger expression to a schema vertex for conflict resolution during pushout-based merge",
        inputSchema: z.object({
          vertex: z.string().describe("Vertex ID to add the merger to"),
          expr: z.string().describe("Merger expression as JSON"),
        }),
        annotations: TOOL_CATALOG.panproto_enrich_add_merger.annotations,
      },
      handler: withErrorBoundary(async ({ vertex, expr }) => {
        const result = await execCli("enrich", "add-merger", vertex as string, "--expr", expr as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_enrich_add_policy",
      config: {
        title: TOOL_CATALOG.panproto_enrich_add_policy.title,
        description: "Add a conflict resolution policy to a schema vertex",
        inputSchema: z.object({
          vertex: z.string().describe("Vertex ID to add the policy to"),
          strategy: z.string().describe("Strategy name"),
        }),
        annotations: TOOL_CATALOG.panproto_enrich_add_policy.annotations,
      },
      handler: withErrorBoundary(async ({ vertex, strategy }) => {
        const result = await execCli("enrich", "add-policy", vertex as string, "--strategy", strategy as string);
        return textContent(result);
      }),
    },
    {
      name: "panproto_enrich_list",
      config: {
        title: TOOL_CATALOG.panproto_enrich_list.title,
        description: "List all enrichments (defaults, coercions, mergers, policies) on the HEAD schema",
        inputSchema: z.object({}),
        annotations: TOOL_CATALOG.panproto_enrich_list.annotations,
      },
      handler: withErrorBoundary(async () => {
        const result = await execCli("enrich", "list");
        return textContent(result);
      }),
    },
    {
      name: "panproto_enrich_remove",
      config: {
        title: TOOL_CATALOG.panproto_enrich_remove.title,
        description: "Remove a named enrichment from the HEAD schema",
        inputSchema: z.object({
          name: z.string().describe("Enrichment name to remove"),
          confirmed: z.boolean().optional().describe("Required for approval when elicitation is unavailable"),
        }),
        annotations: TOOL_CATALOG.panproto_enrich_remove.annotations,
      },
      handler: withErrorBoundary(async ({ name }) => {
        const result = await execCli("enrich", "remove", name as string);
        return textContent(result);
      }),
    },
  ];
}
