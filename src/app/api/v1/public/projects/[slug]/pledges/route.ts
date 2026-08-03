import { NextRequest } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";
import { buildPixPayload } from "@/lib/pix";

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
      select: { id: true, organizationId: true, name: true, organization: { select: { pixKey: true } } },
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

    const pixKey = project.organization.pixKey ?? null
    let qrCodeData: string | null = null
    let qrCodeImage: string | null = null
    if (pixKey) {
      try {
        qrCodeData = buildPixPayload(pixKey, project.name, body.amount)
        const svg = await QRCode.toString(qrCodeData, { type: "svg", margin: 1 })
        qrCodeImage = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
      } catch { /* ignore */ }
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
        qrCodeData,
      },
      select: { id: true, name: true, amount: true, status: true, qrCodeData: true },
    });

    return Response.json({ ...pledge, qrCodeImage }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
