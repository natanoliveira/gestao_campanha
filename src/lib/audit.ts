import { prisma } from "@/lib/prisma";
import type { AuditLogUncheckedCreateInput } from "@/generated/prisma/models/AuditLog";

type AuditParams = {
  organizationId?: string | null;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  ip?: string | null;
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
    };
    await prisma.auditLog.create({ data });
  } catch {
    // audit failure must never break the main operation
  }
}
