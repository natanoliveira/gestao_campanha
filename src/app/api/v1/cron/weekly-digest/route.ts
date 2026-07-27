import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/brevo";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: "ADMIN", deletedAt: null, active: true },
        select: { email: true, name: true },
      },
    },
  });

  let sent = 0;

  for (const org of orgs) {
    if (org.users.length === 0) continue;

    const base        = { organizationId: org.id, deletedAt: null };
    const activeProj  = { project: { status: "ACTIVE", deletedAt: null } };

    const [projectsActive, totalRaisedAgg, totalSpentAgg, overdue, weekPosts] = await Promise.all([
      prisma.project.count({ where: { ...base, status: "ACTIVE" } }),
      prisma.financialEntry.aggregate({ where: { ...base, ...activeProj }, _sum: { amount: true } }),
      prisma.financialExit.aggregate({ where: { ...base, ...activeProj }, _sum: { amount: true } }),
      prisma.initiative.findMany({
        where: { ...base, ...activeProj, endDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: { name: true, endDate: true },
        take: 5,
        orderBy: { endDate: "asc" },
      }),
      prisma.timelinePost.findMany({
        where: { ...base, ...activeProj, publishedAt: { gte: weekAgo } },
        select: { content: true, project: { select: { name: true } } },
        take: 5,
        orderBy: { publishedAt: "desc" },
      }),
    ]);

    const totalRaised = Number(totalRaisedAgg._sum.amount ?? 0);
    const totalSpent  = Number(totalSpentAgg._sum.amount  ?? 0);
    const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

    const overdueHtml = overdue.length
      ? overdue.map((i) => `<li>${i.name} — venceu em ${new Date(i.endDate!).toLocaleDateString("pt-BR")}</li>`).join("")
      : "<li>Nenhuma iniciativa vencida</li>";

    const postsHtml = weekPosts.length
      ? weekPosts.map((p) => `<li><strong>${p.project.name}:</strong> ${p.content.slice(0, 120)}…</li>`).join("")
      : "<li>Sem novos posts esta semana</li>";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f8; color: #1a1a1a; margin: 0; padding: 0; }
  .wrap { max-width: 580px; margin: 0 auto; padding: 40px 24px; }
  .logo { font-size: 13px; font-weight: 700; color: #1a1a1a; letter-spacing: .04em; margin-bottom: 32px; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
  .sub { font-size: 13px; color: #777; margin-bottom: 32px; }
  .kpis { width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 32px; }
  .kpi { background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; padding: 14px 16px; width: 33%; }
  .kpi-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  h2 { font-size: 12px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: .07em; margin: 0 0 10px; }
  ul { margin: 0 0 28px; padding-left: 18px; } li { font-size: 13px; line-height: 1.7; color: #444; }
  .footer { font-size: 11px; color: #bbb; border-top: 1px solid #e8e8e8; padding-top: 20px; margin-top: 32px; }
</style></head>
<body><div class="wrap">
  <div class="logo">GESTÃOPROJETOS</div>
  <h1>Resumo Semanal</h1>
  <p class="sub">${org.name} · ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>

  <table class="kpis"><tr>
    <td class="kpi"><div class="kpi-label">Projetos Ativos</div><div class="kpi-value">${projectsActive}</div></td>
    <td class="kpi"><div class="kpi-label">Arrecadado</div><div class="kpi-value">${fmt(totalRaised)}</div></td>
    <td class="kpi"><div class="kpi-label">Saldo</div><div class="kpi-value">${fmt(totalRaised - totalSpent)}</div></td>
  </tr></table>

  <h2>Iniciativas Vencidas</h2>
  <ul>${overdueHtml}</ul>

  <h2>Posts desta Semana</h2>
  <ul>${postsHtml}</ul>

  <div class="footer">Você está recebendo este email porque é administrador de <strong>${org.name}</strong> no GestãoProjetos.</div>
</div></body></html>`;

    for (const user of org.users) {
      try {
        await sendEmail(user.email, `[${org.name}] Resumo Semanal`, html);
        sent++;
      } catch { /* continue on individual failure */ }
    }
  }

  return Response.json({ ok: true, sent });
}
