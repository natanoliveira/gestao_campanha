import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  note:   z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");

    const existing = await prisma.pledge.findFirst({
      where: { id, organizationId: payload.organizationId },
      select: { id: true, status: true },
    });
    if (!existing) throw new AppError("Oferta não encontrada", 404, "NOT_FOUND");

    const body = patchSchema.parse(await req.json());

    const pledge = await prisma.pledge.update({
      where: { id },
      data: {
        status:            body.status,
        statusChangedById: payload.userId,
        statusChangedAt:   new Date(),
        ...(body.note !== undefined ? { note: body.note } : {}),
      },
      select: { id: true, name: true, amount: true, status: true },
    });

    await logAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: "update",
      entity: "pledge",
      entityId: id,
      ip,
      before: { status: existing.status },
      after:  { status: body.status },
    });

    return Response.json(pledge);
  } catch (e) { return errorResponse(e); }
}
