import { TOOL_CATALOG } from "./tool-catalog.js";
import { AuditLog } from "./audit.js";
import type { PolicyConfig, ToolMetadata } from "./types.js";
import { DEFAULT_POLICY_CONFIG } from "./types.js";
import { textContent } from "../cli.js";

export class PolicyEngine {
  readonly config: PolicyConfig;
  readonly audit: AuditLog;
  private elicitationSupported = false;

  constructor(config: Partial<PolicyConfig> = {}) {
    this.config = { ...DEFAULT_POLICY_CONFIG, ...config };
    this.audit = new AuditLog();
  }

  setElicitationSupported(supported: boolean): void {
    this.elicitationSupported = supported;
  }

  getMetadata(toolName: string): ToolMetadata | undefined {
    return TOOL_CATALOG[toolName];
  }

  async wrap<T extends Record<string, unknown>>(
    toolName: string,
    args: T,
    ctx: { mcpReq?: { elicitInput?: (req: unknown) => Promise<{ action: string; content?: Record<string, unknown> }> } },
    handler: (args: T) => Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: Record<string, unknown> }>,
  ): Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: Record<string, unknown> }> {
    const meta = this.getMetadata(toolName);
    if (!meta) {
      return handler(args);
    }

    const start = Date.now();

    if (meta.requiresApproval && this.config.requireApprovalForDestructive) {
      const approved = await this.requestApproval(toolName, meta, args, ctx);
      if (!approved) {
        const durationMs = Date.now() - start;
        if (this.config.auditLog) {
          this.audit.record(toolName, meta.risk, args, false, "cancelled", durationMs);
        }
        return textContent(`Operation cancelled: ${meta.title}. The operation requires approval before execution.`);
      }
    }

    try {
      const result = await handler(args);
      const durationMs = Date.now() - start;
      if (this.config.auditLog) {
        this.audit.record(toolName, meta.risk, args, true, "success", durationMs);
      }
      return result;
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      if (this.config.auditLog) {
        this.audit.record(toolName, meta.risk, args, true, "error", durationMs);
      }
      throw error;
    }
  }

  private async requestApproval<T extends Record<string, unknown>>(
    toolName: string,
    meta: ToolMetadata,
    args: T,
    ctx: { mcpReq?: { elicitInput?: (req: unknown) => Promise<{ action: string; content?: Record<string, unknown> }> } },
  ): Promise<boolean> {
    if (this.elicitationSupported && ctx.mcpReq?.elicitInput) {
      try {
        const result = await ctx.mcpReq.elicitInput({
          mode: "form",
          message: `${meta.confirmationMessage ?? `${meta.title} is a destructive operation.`}\n\nTool: ${toolName}\nArguments: ${JSON.stringify(args, null, 2)}`,
          requestedSchema: {
            type: "object",
            properties: {
              confirm: {
                type: "boolean",
                title: "Proceed with this operation?",
              },
            },
            required: ["confirm"],
          },
        });
        return result.action === "accept" && result.content?.confirm === true;
      } catch {
        return this.fallbackApproval(args);
      }
    }

    return this.fallbackApproval(args);
  }

  private fallbackApproval<T extends Record<string, unknown>>(args: T): boolean {
    return (args as Record<string, unknown>).confirmed === true;
  }
}
