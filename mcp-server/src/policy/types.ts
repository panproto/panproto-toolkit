export type RiskLevel = "read" | "write-additive" | "write-destructive";

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolMetadata {
  title: string;
  risk: RiskLevel;
  annotations: ToolAnnotations;
  requiresApproval: boolean;
  confirmationMessage?: string;
}

export interface AuditEntry {
  timestamp: string;
  toolName: string;
  risk: RiskLevel;
  args: Record<string, unknown>;
  approved: boolean;
  result: "success" | "error" | "cancelled";
  durationMs: number;
}

export interface PolicyConfig {
  autoApproveReads: boolean;
  autoApproveAdditiveWrites: boolean;
  requireApprovalForDestructive: boolean;
  auditLog: boolean;
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  autoApproveReads: true,
  autoApproveAdditiveWrites: true,
  requireApprovalForDestructive: true,
  auditLog: true,
};
