import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { projectService } from "@/modules/projects/service";
import { updateProjectSchema } from "@/modules/projects/dto";
import { errorResponse } from "@/lib/errors";

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
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const dto = updateProjectSchema.parse(await req.json());
    return Response.json(await projectService.update(id, payload.organizationId, dto));
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id } = await params;
    await projectService.delete(id, payload.organizationId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
