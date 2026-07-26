import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { initiativeService } from "@/modules/initiatives/service";
import { updateInitiativeSchema } from "@/modules/initiatives/dto";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string; initId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id, initId } = await params;
    return Response.json(await initiativeService.findById(initId, id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "initiative:write");
    const { id, initId } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const dto = updateInitiativeSchema.parse(await req.json());
    const updated = await initiativeService.update(initId, id, payload.organizationId, dto);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "update", entity: "initiative", entityId: initId, ip });
    return Response.json(updated);
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id, initId } = await params;
    const ip = req.headers.get("x-forwarded-for");
    await initiativeService.remove(initId, id, payload.organizationId);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "initiative", entityId: initId, ip });
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
