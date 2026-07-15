import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { updateFinancialCategorySchema } from "@/modules/financial-categories/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const dto = updateFinancialCategorySchema.parse(await req.json());
    return Response.json(await financialCategoryService.update(id, payload.organizationId, dto));
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id } = await params;
    await financialCategoryService.remove(id, payload.organizationId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
