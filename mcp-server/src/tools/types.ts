import type { z } from "zod";

export type ZodRawShape = Record<string, z.ZodType>;

export interface ToolDefinition {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema: z.ZodObject<ZodRawShape>;
    annotations: {
      title?: string;
      readOnlyHint?: boolean;
      destructiveHint?: boolean;
      idempotentHint?: boolean;
      openWorldHint?: boolean;
    };
    outputSchema?: z.ZodObject<ZodRawShape>;
  };
  handler: (args: Record<string, unknown>, extra?: unknown) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  }>;
}
