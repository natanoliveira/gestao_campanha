import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { timelineService } from "@/modules/timeline/service";
import { createTimelinePostSchema } from "@/modules/timeline/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await timelineService.list(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const dto = createTimelinePostSchema.parse(await req.json());
    const post = await timelineService.create(id, payload.organizationId, payload.userId, dto);
    return Response.json(post, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
