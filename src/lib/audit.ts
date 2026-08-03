import { prisma } from "@/lib/prisma";
import type { AuditLogUncheckedCreateInput } from "@/generated/prisma/models/AuditLog";

type AuditParams = {
  organizationId?: string | null;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  ip?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const data: AuditLogUncheckedCreateInput = {
      organizationId: params.organizationId ?? undefined,
      userId:         params.userId,
      action:         params.action,
      entity:         params.entity,
      entityId:       params.entityId,
      ip:             params.ip,
      before:         params.before as object | undefined,
      after:          params.after as object | undefined,
    };
    await prisma.auditLog.create({ data });
  } catch {
    // audit failure must never break the main operation
  }
}
