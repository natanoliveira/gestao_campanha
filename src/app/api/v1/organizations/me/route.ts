import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = authenticate(req);
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            maxProjects: true,
            maxInitiatives: true,
            maxUsers: true,
            priceMonthly: true,
          },
        },
      },
    });
    if (!org) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Organização não encontrada" } },
        { status: 404 }
      );
    }
    return Response.json(org);
  } catch (error) {
    return errorResponse(error);
  }
}
