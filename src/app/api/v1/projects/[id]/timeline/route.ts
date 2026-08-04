import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { timelineRepository } from "@/modules/timeline/repository";
import { createTimelinePostSchema } from "@/modules/timeline/dto";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await timelineRepository.list(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "timeline:write");
    const { id } = await params;
    const dto = createTimelinePostSchema.parse(await req.json());
    const ip = req.headers.get("x-forwarded-for");
    const post = await timelineRepository.create({ ...dto, projectId: id, organizationId: payload.organizationId, authorId: payload.userId });
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "create", entity: "timeline-post", entityId: post.id, ip });
    return Response.json(post, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
