import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; exitId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id, exitId } = await params;
    await financialService.removeExit(exitId, id);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
