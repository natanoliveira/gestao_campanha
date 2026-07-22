import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { initiativeService } from "@/modules/initiatives/service";
import { updateInitiativeSchema } from "@/modules/initiatives/dto";
import { errorResponse } from "@/lib/errors";

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
    const dto = updateInitiativeSchema.parse(await req.json());
    return Response.json(await initiativeService.update(initId, id, payload.organizationId, dto));
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id, initId } = await params;
    await initiativeService.remove(initId, id, payload.organizationId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
