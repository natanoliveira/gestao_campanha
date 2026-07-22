import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { projectService } from "@/modules/projects/service";
import { createProjectSchema, listProjectsSchema } from "@/modules/projects/dto";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const { searchParams } = new URL(req.url);
    const dto = listProjectsSchema.parse(Object.fromEntries(searchParams));
    return Response.json(await projectService.list(payload.organizationId, dto));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, "project:write");
    const dto = createProjectSchema.parse(await req.json());
    const project = await projectService.create(payload.organizationId, payload.userId, dto);
    return Response.json(project, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
