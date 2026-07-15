import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { timelineService } from "@/modules/timeline/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; postId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id, postId } = await params;
    await timelineService.remove(postId, id);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
