import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/pagination";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  projectId:    z.string(),
  initiativeId: z.string().optional(),
  name:         z.string().min(2).max(100),
  email:        z.string().email().optional(),
  amount:       z.coerce.number().positive(),
  note:         z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");

    const { searchParams } = new URL(req.url);
    const page          = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit         = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const status        = searchParams.get("status")       ?? undefined;
    const projectId     = searchParams.get("projectId")    ?? undefined;
    const initiativeId  = searchParams.get("initiativeId") ?? undefined;
    const q             = searchParams.get("q")            ?? undefined;
    const dateFrom      = searchParams.get("dateFrom")     ?? undefined;
    const dateTo        = searchParams.get("dateTo")       ?? undefined;

    const where = {
      organizationId: payload.organizationId,
      ...(status       ? { status: status as "PENDING" | "CONFIRMED" | "CANCELLED" } : {}),
      ...(projectId    ? { projectId } : {}),
      ...(initiativeId ? { initiativeId } : {}),
      ...(q            ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...((dateFrom || dateTo) ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59") } : {}),
        },
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.pledge.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, email: true, amount: true, note: true,
          status: true, createdAt: true, statusChangedAt: true,
          project:         { select: { id: true, name: true } },
          initiative:      { select: { id: true, name: true } },
          statusChangedBy: { select: { name: true } },
        },
      }),
      prisma.pledge.count({ where }),
    ]);

    return Response.json(paginatedResponse(data, total, page, limit));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");
    const ip = req.headers.get("x-forwarded-for");

    const body = createSchema.parse(await req.json());

    const pledge = await prisma.pledge.create({
      data: {
        organizationId: payload.organizationId,
        projectId:      body.projectId,
        initiativeId:   body.initiativeId ?? null,
        name:           body.name,
        email:          body.email ?? null,
        amount:         body.amount,
        note:           body.note ?? null,
        status:         "CONFIRMED",
      },
      select: { id: true, name: true, amount: true, status: true },
    });

    await logAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: "create",
      entity: "pledge",
      entityId: pledge.id,
      ip,
    });

    return Response.json(pledge, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
