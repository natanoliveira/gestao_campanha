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
        id: true, name: true, description: true, status: true, endDate: true,
        organization: {
          select: { name: true, pixKey: true, whatsapp: true, pixQrCodeUrl: true },
        },
        initiatives: {
          where: { deletedAt: null },
          orderBy: { priority: "asc" },
          select: {
            id: true, name: true, goal: true, status: true,
            entries: { where: { deletedAt: null }, select: { amount: true } },
            exits:   { where: { deletedAt: null }, select: { amount: true } },
            pledges: { where: { status: "CONFIRMED" }, select: { amount: true } },
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
        financialExits: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: { id: true, description: true, amount: true, date: true, supplier: true },
        },
        pledges: {
          where: { status: "CONFIRMED" },
          select: { amount: true },
        },
        _count: { select: { financialEntries: true } },
      },
    });

    if (!project) throw new AppError("Portal não encontrado", 404, "NOT_FOUND");

    const totalGoal     = project.initiatives.reduce((s, i) => s + Number(i.goal), 0);
    const totalRaised   = project.initiatives.reduce(
      (s, i) => s + i.entries.reduce((a, e) => a + Number(e.amount), 0), 0
    );
    const totalExecuted = project.initiatives.reduce(
      (s, i) => s + i.exits.reduce((a, e) => a + Number(e.amount), 0), 0
    );
    const totalPledged  = project.pledges.reduce((s, p) => s + Number(p.amount), 0);

    return Response.json({
      id:          project.id,
      name:        project.name,
      description: project.description,
      status:      project.status,
      endDate:     project.endDate,
      organization: project.organization.name,
      pix: {
        key:      project.organization.pixKey    ?? null,
        qrCode:   project.organization.pixQrCodeUrl ?? null,
        whatsapp: project.organization.whatsapp  ?? null,
      },
      stats: {
        totalGoal,
        totalPledged,
        totalRaised,
        totalExecuted,
        goalPercent: totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0,
        supporters:  project._count.financialEntries,
      },
      initiatives: project.initiatives.map(({ entries, exits, pledges: ip, ...i }) => ({
        ...i,
        goal:     Number(i.goal),
        pledged:  ip.reduce((s, p) => s + Number(p.amount), 0),
        raised:   entries.reduce((s, e) => s + Number(e.amount), 0),
        executed: exits.reduce((s, e)   => s + Number(e.amount), 0),
      })),
      timelinePosts:  project.timelinePosts,
      financialExits: project.financialExits,
    });
  } catch (e) { return errorResponse(e); }
}
