import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { organizationService } from "@/modules/organizations/service";
import { updateOrganizationSchema } from "@/modules/organizations/dto";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    if (id !== payload.organizationId) {
      return Response.json({ error: { code: "FORBIDDEN", message: "Acesso negado" } }, { status: 403 });
    }
    const org = await organizationService.findById(id);
    return Response.json(org);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id } = await params;
    const body = await req.json();
    const dto = updateOrganizationSchema.parse(body);
    const org = await organizationService.update(id, payload.organizationId, dto);
    return Response.json(org);
  } catch (error) {
    return errorResponse(error);
  }
}
