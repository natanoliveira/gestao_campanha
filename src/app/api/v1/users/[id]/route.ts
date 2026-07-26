import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { userService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/dto";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    const user = await userService.findById(id, payload.organizationId);
    return Response.json(user);
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
    const dto = updateUserSchema.parse(body);
    const ip = req.headers.get("x-forwarded-for");
    const user = await userService.update(id, payload.organizationId, dto);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "update", entity: "user", entityId: id, ip });
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");
    await userService.remove(id, payload.organizationId, payload.userId);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "user", entityId: id, ip });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
