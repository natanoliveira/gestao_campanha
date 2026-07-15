import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { createFinancialCategorySchema } from "@/modules/financial-categories/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    void id; // ponytail: projectId unused after org-level refactor; Task 3 replaces this route
    return Response.json(await financialCategoryService.list(payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    void id; // ponytail: projectId unused after org-level refactor; Task 3 replaces this route
    const dto = createFinancialCategorySchema.parse(await req.json());
    const cat = await financialCategoryService.create(payload.organizationId, dto);
    return Response.json(cat, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
