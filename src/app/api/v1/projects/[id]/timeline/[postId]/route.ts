import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { timelineService } from "@/modules/timeline/service";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string; postId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id, postId } = await params;
    const ip = req.headers.get("x-forwarded-for");
    await timelineService.remove(postId, id);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "timeline-post", entityId: postId, ip });
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
