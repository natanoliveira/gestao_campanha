import { NextRequest } from "next/server"
import { authenticate } from "@/middlewares/authenticate"
import { prisma } from "@/lib/prisma"
import { AppError, errorResponse } from "@/lib/errors"

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? ""

    const where = {
      deletedAt: null,
      slug: { not: "sistema" },
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { name: "asc" },
        take: 100,
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          deletedAt: true,
          plan: { select: { id: true, name: true, priceMonthly: true } },
          _count: { select: { users: true, projects: true } },
        },
      }),
      prisma.organization.count({ where }),
    ])

    return Response.json({ data, total })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { name, slug, planId } = await req.json()
    if (!name || !slug) throw new AppError("name e slug são obrigatórios", 400, "BAD_REQUEST")

    const existing = await prisma.organization.findFirst({ where: { slug, deletedAt: null } })
    if (existing) throw new AppError("Slug já em uso", 409, "CONFLICT")

    const org = await prisma.organization.create({
      data: { name, slug, ...(planId ? { planId } : {}) },
      select: { id: true, name: true, slug: true, active: true, plan: { select: { id: true, name: true } } },
    })

    return Response.json(org, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
