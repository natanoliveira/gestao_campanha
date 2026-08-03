import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";

const schema = z.object({
  name:         z.string().min(2).max(100),
  email:        z.string().email().optional(),
  amount:       z.coerce.number().positive().transform(v => Math.round(v * 100) / 100),
  initiativeId: z.string().optional(),
  note:         z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findFirst({
      where: { publicSlug: slug, isPublic: true, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!project) throw new AppError("Projeto não encontrado", 404, "NOT_FOUND");

    const body = schema.parse(await req.json());

    if (body.initiativeId) {
      const init = await prisma.initiative.findFirst({
        where: { id: body.initiativeId, projectId: project.id, deletedAt: null },
        select: { id: true },
      });
      if (!init) throw new AppError("Iniciativa não encontrada", 404, "NOT_FOUND");
    }

    const pledge = await prisma.pledge.create({
      data: {
        organizationId: project.organizationId,
        projectId:      project.id,
        initiativeId:   body.initiativeId ?? null,
        name:           body.name,
        email:          body.email ?? null,
        amount:         body.amount,
        note:           body.note ?? null,
      },
      select: { id: true, name: true, amount: true, status: true },
    });

    return Response.json(pledge, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
