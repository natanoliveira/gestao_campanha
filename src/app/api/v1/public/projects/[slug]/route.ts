import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findFirst({
      where: { publicSlug: slug, isPublic: true, deletedAt: null },
      select: {
        id: true, name: true, description: true, status: true,
        organization: { select: { name: true } },
        initiatives: {
          where: { deletedAt: null },
          orderBy: { priority: "asc" },
          select: {
            id: true, name: true, goal: true, status: true,
            entries: { where: { deletedAt: null }, select: { amount: true } },
          },
        },
        timelinePosts: {
          where: { deletedAt: null },
          orderBy: { publishedAt: "desc" },
          take: 20,
          select: {
            id: true, content: true, type: true, publishedAt: true,
            author: { select: { name: true } },
          },
        },
        financialEntries: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: { id: true, description: true, amount: true, date: true },
        },
        financialExits: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: { id: true, description: true, amount: true, date: true, supplier: true },
        },
        _count: { select: { financialEntries: true } },
      },
    });

    if (!project) throw new AppError("Portal não encontrado", 404, "NOT_FOUND");

    const totalGoal   = project.initiatives.reduce((s, i) => s + Number(i.goal), 0);
    const totalIn     = project.financialEntries.reduce((s, e) => s + Number(e.amount), 0);
    const totalRaised = totalIn; // ponytail: raised removed from Initiative; entries sum is the source of truth
    const totalOut    = project.financialExits.reduce((s, e)   => s + Number(e.amount), 0);

    return Response.json({
      id:           project.id,
      name:         project.name,
      description:  project.description,
      status:       project.status,
      organization: project.organization.name,
      stats: {
        totalRaised,
        totalGoal,
        goalPercent: totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0,
        supporters:  project._count.financialEntries,
        balance:     totalIn - totalOut,
      },
      initiatives: project.initiatives.map(({ entries, ...i }) => ({
        ...i,
        raised: entries.reduce((s, e) => s + Number(e.amount), 0),
      })),
      timelinePosts:    project.timelinePosts,
      financialEntries: project.financialEntries,
      financialExits:   project.financialExits,
    });
  } catch (e) { return errorResponse(e); }
}
