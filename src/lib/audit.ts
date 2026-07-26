import { prisma } from "@/lib/prisma";

type AuditParams = {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  ip?: string | null;
};

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // audit failure must never break the main operation
  }
}
