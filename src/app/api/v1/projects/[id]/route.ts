import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { projectService } from "@/modules/projects/service";
import { updateProjectSchema } from "@/modules/projects/dto";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await projectService.getById(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "project:write");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const dto = updateProjectSchema.parse(await req.json());
    const before = await projectService.getById(id, payload.organizationId);
    const updated = await projectService.update(id, payload.organizationId, dto);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "update", entity: "project", entityId: id, ip, before: before as Record<string, unknown>, after: updated as Record<string, unknown> });
    return Response.json(updated);
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const before = await projectService.getById(id, payload.organizationId);
    await projectService.delete(id, payload.organizationId);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "project", entityId: id, ip, before: before as Record<string, unknown> });
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
