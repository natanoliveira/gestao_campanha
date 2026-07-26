import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { updateFinancialCategorySchema } from "@/modules/financial-categories/dto";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "category:write");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");
    const dto = updateFinancialCategorySchema.parse(await req.json());
    const updated = await financialCategoryService.update(id, payload.organizationId, dto);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "update", entity: "financial-category", entityId: id, ip });
    return Response.json(updated);
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");
    await financialCategoryService.remove(id, payload.organizationId);
    await logAudit({ organizationId: payload.organizationId, userId: payload.userId, action: "delete", entity: "financial-category", entityId: id, ip });
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
