import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { createFinancialCategorySchema } from "@/modules/financial-categories/dto";
import { errorResponse } from "@/lib/errors";
import type { FinancialCategoryType } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const type = req.nextUrl.searchParams.get("type") as FinancialCategoryType | null;
    return Response.json(await financialCategoryService.list(payload.organizationId, type ?? undefined));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, "category:write");
    const dto = createFinancialCategorySchema.parse(await req.json());
    return Response.json(await financialCategoryService.create(payload.organizationId, dto), { status: 201 });
  } catch (e) { return errorResponse(e); }
}
