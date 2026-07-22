import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { createFinancialExitSchema } from "@/modules/financial/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; initId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { initId } = await params;
    return Response.json(await financialService.listExits(initId, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");
    const { id, initId } = await params;
    const dto = createFinancialExitSchema.parse(await req.json());
    return Response.json(
      await financialService.createExit(id, initId, payload.organizationId, payload.userId, dto),
      { status: 201 }
    );
  } catch (e) { return errorResponse(e); }
}
