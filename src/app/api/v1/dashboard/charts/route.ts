import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/middlewares/authenticate";
import { errorResponse } from "@/lib/errors";

function groupByMonth(rows: { amount: unknown; date: Date }[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 7);
    m.set(key, (m.get(key) ?? 0) + Number(r.amount));
  }
  return m;
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = authenticate(req);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const base = { organizationId, deletedAt: null };

    const [entries, exits, initiatives, categories, entriesByCat, exitsByCat] = await Promise.all([
      prisma.financialEntry.findMany({
        where: { ...base, date: { gte: sixMonthsAgo } },
        select: { amount: true, date: true },
      }),
      prisma.financialExit.findMany({
        where: { ...base, date: { gte: sixMonthsAgo } },
        select: { amount: true, date: true },
      }),
      prisma.initiative.findMany({
        where: { project: { organizationId, deletedAt: null }, deletedAt: null, status: { not: "CANCELLED" } },
        select: {
          name: true,
          goal: true,
          status: true,
          entries: { where: { deletedAt: null }, select: { amount: true } },
        },
        take: 10,
        orderBy: { goal: "desc" },
      }),
      prisma.financialCategory.findMany({ where: base, select: { id: true, name: true } }),
      prisma.financialEntry.groupBy({ by: ["categoryId"], where: base, _sum: { amount: true } }),
      prisma.financialExit.groupBy({ by: ["categoryId"], where: base, _sum: { amount: true } }),
    ]);

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    const entryMap = groupByMonth(entries);
    const exitMap  = groupByMonth(exits);

    const financialEvolution = months.map((m) => ({
      month:    m.slice(5) + "/" + m.slice(2, 4),
      entradas: entryMap.get(m) ?? 0,
      saidas:   exitMap.get(m) ?? 0,
    }));

    const initiativesProgress = initiatives.map((i) => ({
      name:   i.name.length > 22 ? i.name.slice(0, 22) + "…" : i.name,
      meta:   Number(i.goal),
      raised: i.entries.reduce((s, e) => s + Number(e.amount), 0),
    }));

    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const toDist = (rows: { categoryId: string | null; _sum: { amount: unknown } }[]) =>
      rows
        .map((r) => ({
          name:  r.categoryId ? (catMap.get(r.categoryId) ?? "Removida") : "Sem categoria",
          value: Number(r._sum.amount ?? 0),
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value);

    return Response.json({
      financialEvolution,
      initiativesProgress,
      categoryDistribution: { entries: toDist(entriesByCat), exits: toDist(exitsByCat) },
    });
  } catch (e) { return errorResponse(e); }
}
