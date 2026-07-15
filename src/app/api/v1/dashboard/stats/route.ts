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
      entriesByCatRaw,
      exitsByCatRaw,
      allCategories,
    ] = await Promise.all([
      prisma.project.count({ where: { ...base, status: "ACTIVE" } }),
      prisma.project.count({ where: base }),
      prisma.initiative.aggregate({
        where: base,
        _sum: { goal: true },
        _count: { id: true },
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
            select: { goal: true },
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
      prisma.financialEntry.groupBy({
        by: ["categoryId"],
        where: { organizationId, deletedAt: null },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financialExit.groupBy({
        by: ["categoryId"],
        where: { organizationId, deletedAt: null },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financialCategory.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true, type: true },
      }),
    ]);

    const totalRaised = Number(entriesSum._sum.amount ?? 0);
    const totalSpent  = Number(exitsSum._sum.amount  ?? 0);
    const totalGoal   = Number(initiativeStats._sum?.goal ?? 0);
    // ponytail: raised removed from Initiative schema; totalRaised (entries sum) is the source of truth
    const goalPercent = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;

    const catMap = new Map(allCategories.map((c) => [c.id, c.name]));
    const toReport = (rows: typeof entriesByCatRaw) => rows.map((r) => ({
      categoryId:   r.categoryId,
      categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? "Removida") : null,
      total:        Number(r._sum.amount ?? 0),
      count:        r._count.id,
    }));
    const entriesByCategory = toReport(entriesByCatRaw);
    const exitsByCategory   = toReport(exitsByCatRaw);

    return Response.json({
      projectsActive,
      projectsTotal,
      totalRaised,
      totalSpent,
      balance: totalRaised - totalSpent,
      goalPercent,
      initiativesTotal: initiativeStats._count?.id ?? 0,
      recentProjects: recentProjects.map((p) => {
        const goal = (p.initiatives ?? []).reduce((s: number, i: { goal: unknown }) => s + Number(i.goal), 0);
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          goal,
          raisedPercent: 0, // ponytail: raised removed from Initiative; UI tasks will recompute from entries
        };
      }),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        content: a.content,
        publishedAt: a.publishedAt,
        authorName: a.author.name,
        projectName: a.project.name,
      })),
      entriesByCategory,
      exitsByCategory,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
