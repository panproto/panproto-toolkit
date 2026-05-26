import { z } from "zod";
import type { PolicyEngine } from "../policy/engine.js";
import type { ToolDefinition } from "./types.js";

export function auditTools(policy: PolicyEngine): ToolDefinition[] {
  return [
    {
      name: "panproto_session_audit",
      config: {
        title: "Session Audit Log",
        description: "View the audit log for all tool invocations in this session, including risk classification, approval status, and execution time",
        inputSchema: z.object({
          tool_filter: z.string().optional().describe("Filter entries by tool name prefix"),
        }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        outputSchema: z.object({
          entries: z.array(z.object({
            timestamp: z.string(),
            toolName: z.string(),
            risk: z.string(),
            approved: z.boolean(),
            result: z.string(),
            durationMs: z.number(),
          })),
          summary: z.object({
            total: z.number(),
            approved: z.number(),
            denied: z.number(),
            errors: z.number(),
          }),
        }),
      },
      handler: async (args) => {
        const tool_filter = args.tool_filter as string | undefined;
        const entries = tool_filter
          ? policy.audit.getEntriesForTool(tool_filter)
          : policy.audit.getEntries();
        const summary = policy.audit.summary();
        const output = { entries, summary };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      },
    },
  ];
}
