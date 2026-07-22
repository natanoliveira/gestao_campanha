import { can } from "@/lib/permissions";
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { initiativeService } from "@/modules/initiatives/service";
import { createInitiativeSchema, listInitiativesSchema } from "@/modules/initiatives/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    if (rawParams.showDeleted && !can(payload.role, "org:manage")) delete rawParams.showDeleted;
    const p = listInitiativesSchema.parse(rawParams);
    return Response.json(await initiativeService.list(id, payload.organizationId, p));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "initiative:write");
    const { id } = await params;
    const dto = createInitiativeSchema.parse(await req.json());
    const init = await initiativeService.create(id, payload.organizationId, dto);
    return Response.json(init, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
