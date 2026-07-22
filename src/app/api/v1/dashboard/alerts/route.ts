import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/middlewares/authenticate";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = authenticate(req);

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const initiatives = await prisma.initiative.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        endDate: { not: null, lte: in30 },
      },
      select: {
        id: true,
        name: true,
        endDate: true,
        status: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { endDate: "asc" },
    });

    const data = initiatives.map((i) => {
      const diff = i.endDate!.getTime() - now.getTime();
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return {
        id: i.id,
        name: i.name,
        endDate: i.endDate,
        status: i.status,
        projectId: i.project.id,
        projectName: i.project.name,
        daysLeft,
      };
    });

    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
