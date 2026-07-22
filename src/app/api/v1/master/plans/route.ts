import { NextRequest } from "next/server"
import { authenticate } from "@/middlewares/authenticate"
import { prisma } from "@/lib/prisma"
import { AppError, errorResponse } from "@/lib/errors"

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const data = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" },
      select: {
        id: true,
        name: true,
        maxProjects: true,
        maxInitiatives: true,
        maxUsers: true,
        priceMonthly: true,
        active: true,
        _count: { select: { organizations: true } },
      },
    })

    return Response.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { name, maxProjects, maxInitiatives, maxUsers, priceMonthly } = await req.json()
    if (!name) throw new AppError("name é obrigatório", 400, "BAD_REQUEST")

    const plan = await prisma.plan.create({
      data: {
        name,
        maxProjects:    maxProjects    ?? 3,
        maxInitiatives: maxInitiatives ?? 5,
        maxUsers:       maxUsers       ?? 5,
        priceMonthly:   priceMonthly   ?? 0,
      },
    })

    return Response.json(plan, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
