import { NextRequest } from "next/server"
import { authenticate } from "@/middlewares/authenticate"
import { prisma } from "@/lib/prisma"
import { AppError, errorResponse } from "@/lib/errors"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { id } = await params
    const { name, slug, planId, active } = await req.json()

    if (slug) {
      const conflict = await prisma.organization.findFirst({
        where: { slug, deletedAt: null, id: { not: id } },
      })
      if (conflict) throw new AppError("Slug já em uso", 409, "CONFLICT")
    }

    const org = await prisma.organization.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(planId !== undefined ? { planId } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      select: { id: true, name: true, slug: true, active: true, plan: { select: { id: true, name: true } } },
    })

    return Response.json(org)
  } catch (error) {
    return errorResponse(error)
  }
}
