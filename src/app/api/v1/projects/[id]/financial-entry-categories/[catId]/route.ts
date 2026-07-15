import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; catId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id, catId } = await params;
    await financialCategoryService.remove(catId, payload.organizationId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
