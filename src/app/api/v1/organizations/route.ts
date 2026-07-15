import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { organizationService } from "@/modules/organizations/service";
import { createOrganizationSchema } from "@/modules/organizations/dto";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const body = await req.json();
    const dto = createOrganizationSchema.parse(body);
    const org = await organizationService.create(dto);
    return Response.json(org, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
