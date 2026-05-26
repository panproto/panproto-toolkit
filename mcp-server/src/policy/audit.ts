import type { AuditEntry, RiskLevel } from "./types.js";

export class AuditLog {
  private entries: AuditEntry[] = [];

  record(
    toolName: string,
    risk: RiskLevel,
    args: Record<string, unknown>,
    approved: boolean,
    result: AuditEntry["result"],
    durationMs: number,
  ): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      toolName,
      risk,
      args,
      approved,
      result,
      durationMs,
    });
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getEntriesForTool(toolName: string): AuditEntry[] {
    return this.entries.filter((e) => e.toolName === toolName);
  }

  summary(): { total: number; approved: number; denied: number; errors: number } {
    return {
      total: this.entries.length,
      approved: this.entries.filter((e) => e.approved).length,
      denied: this.entries.filter((e) => !e.approved).length,
      errors: this.entries.filter((e) => e.result === "error").length,
    };
  }
}
