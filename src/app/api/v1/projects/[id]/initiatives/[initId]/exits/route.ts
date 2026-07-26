import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { createFinancialExitSchema } from "@/modules/financial/dto";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string; initId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { initId } = await params;
    return Response.json(await financialService.listExits(initId, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");
    const { id, initId } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const dto = createFinancialExitSchema.parse(await req.json());
    const exit = await financialService.createExit(id, initId, payload.organizationId, payload.userId, dto);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "create", entity: "financial-exit", entityId: exit.id, ip });
    return Response.json(exit, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
