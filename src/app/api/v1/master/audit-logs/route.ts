import { NextRequest } from "next/server"
import { authenticate } from "@/middlewares/authenticate"
import { prisma } from "@/lib/prisma"
import { AppError, errorResponse } from "@/lib/errors"

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req)
    if (!payload.isMaster) throw new AppError("Acesso negado", 403, "FORBIDDEN")

    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, Number(searchParams.get("page")  ?? 1))
    const limit  = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)))
    const entity = searchParams.get("entity") ?? undefined
    const action = searchParams.get("action") ?? undefined
    const orgId  = searchParams.get("orgId")  ?? undefined

    const where = {
      ...(entity ? { entity }            : {}),
      ...(action ? { action }            : {}),
      ...(orgId  ? { organizationId: orgId } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          ip: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return Response.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return errorResponse(error)
  }
}
