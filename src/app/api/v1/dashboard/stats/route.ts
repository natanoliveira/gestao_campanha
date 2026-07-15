import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/middlewares/authenticate";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = authenticate(req);
    const base = { organizationId, deletedAt: null };

    const [
      projectsActive,
      projectsTotal,
      initiativeStats,
      entriesSum,
      exitsSum,
      recentProjects,
      recentActivity,
    ] = await Promise.all([
      prisma.project.count({ where: { ...base, status: "ACTIVE" } }),
      prisma.project.count({ where: base }),
      prisma.initiative.aggregate({
        where: base,
        _sum: { goal: true, raised: true },
        _count: { _all: true },
      }),
      prisma.financialEntry.aggregate({ where: base, _sum: { amount: true } }),
      prisma.financialExit.aggregate({ where: base, _sum: { amount: true } }),
      prisma.project.findMany({
        where: base,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          initiatives: {
            where: { deletedAt: null },
            select: { goal: true, raised: true },
          },
        },
      }),
      prisma.timelinePost.findMany({
        where: base,
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          publishedAt: true,
          author: { select: { name: true } },
          project: { select: { name: true } },
        },
      }),
    ]);

    const totalRaised = Number(entriesSum._sum.amount ?? 0);
    const totalSpent  = Number(exitsSum._sum.amount  ?? 0);
    const totalGoal   = Number(initiativeStats._sum.goal   ?? 0);
    const totalRaisedInit = Number(initiativeStats._sum.raised ?? 0);
    const goalPercent = totalGoal > 0 ? Math.round((totalRaisedInit / totalGoal) * 100) : 0;

    return Response.json({
      projectsActive,
      projectsTotal,
      totalRaised,
      totalSpent,
      balance: totalRaised - totalSpent,
      goalPercent,
      initiativesTotal: initiativeStats._count._all,
      recentProjects: recentProjects.map((p) => {
        const goal   = p.initiatives.reduce((s, i) => s + Number(i.goal),   0);
        const raised = p.initiatives.reduce((s, i) => s + Number(i.raised), 0);
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          raised,
          goal,
          raisedPercent: goal > 0 ? Math.round((raised / goal) * 100) : 0,
        };
      }),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        content: a.content,
        publishedAt: a.publishedAt,
        authorName: a.author.name,
        projectName: a.project.name,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
