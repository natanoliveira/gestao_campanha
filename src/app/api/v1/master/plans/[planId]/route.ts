import { NextRequest } from "next/server"
import { authenticate } from "@/middlewares/authenticate"
import { prisma } from "@/lib/prisma"
import { AppError, errorResponse } from "@/lib/errors"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { planId } = await params
    const { name, maxProjects, maxInitiatives, maxUsers, priceMonthly } = await req.json()

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: {
        ...(name            !== undefined ? { name }            : {}),
        ...(maxProjects     !== undefined ? { maxProjects }     : {}),
        ...(maxInitiatives  !== undefined ? { maxInitiatives }  : {}),
        ...(maxUsers        !== undefined ? { maxUsers }        : {}),
        ...(priceMonthly    !== undefined ? { priceMonthly }    : {}),
      },
    })

    return Response.json(plan)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { planId } = await params
    await prisma.plan.update({ where: { id: planId }, data: { active: false } })

    return new Response(null, { status: 204 })
  } catch (error) {
    return errorResponse(error)
  }
}
