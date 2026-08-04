import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { financialRepository } from "@/modules/financial/repository";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ initId: string; exitId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { initId, exitId } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const before = await financialRepository.findExit(exitId, initId, payload.organizationId);
    await financialService.removeExit(exitId, initId, payload.organizationId);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "financial-exit", entityId: exitId, ip, before: before as Record<string, unknown> });
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
