import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await financialCategoryService.reportEntries(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}
