import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

// ponytail: project-level rollup for ContasTab; POST moved to /initiatives/[initId]/exits
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    const exits = await prisma.financialExit.findMany({
      where: { projectId: id, organizationId: payload.organizationId, deletedAt: null },
      select: { id: true, description: true, amount: true, date: true, categoryId: true, supplier: true, deletedAt: true, category: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
    return Response.json(exits);
  } catch (e) { return errorResponse(e); }
}
