import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; entryId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id, entryId } = await params;
    await financialService.removeEntry(entryId, id);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
