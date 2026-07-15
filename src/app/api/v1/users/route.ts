import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { userService } from "@/modules/users/service";
import { createUserSchema, listUsersSchema } from "@/modules/users/dto";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER", "AUDITOR"]);
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    if (rawParams.showDeleted && payload.role !== "ADMIN") {
      delete rawParams.showDeleted;
    }
    const params = listUsersSchema.parse(rawParams);
    const result = await userService.list(payload.organizationId, params);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const body = await req.json();
    const dto = createUserSchema.parse(body);
    const user = await userService.create(payload.organizationId, dto);
    return Response.json(user, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
