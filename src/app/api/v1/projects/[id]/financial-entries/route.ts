import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { createFinancialEntrySchema } from "@/modules/financial/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await financialService.listEntries(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const dto = createFinancialEntrySchema.parse(await req.json());
    const entry = await financialService.createEntry(id, payload.organizationId, payload.userId, dto);
    return Response.json(entry, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
