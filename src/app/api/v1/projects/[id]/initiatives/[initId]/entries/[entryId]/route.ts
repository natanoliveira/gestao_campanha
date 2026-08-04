import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { financialRepository } from "@/modules/financial/repository";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ initId: string; entryId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { initId, entryId } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const before = await financialRepository.findEntry(entryId, initId, payload.organizationId);
    await financialService.removeEntry(entryId, initId, payload.organizationId);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "financial-entry", entityId: entryId, ip, before: before as Record<string, unknown> });
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
