import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type Ctx = { params: Promise<{ id: string }> };

const styles = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, padding: 40, backgroundColor: "#ffffff", color: "#1a1a1a" },
  header:      { marginBottom: 24 },
  title:       { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle:    { fontSize: 10, color: "#666666" },
  section:     { marginBottom: 16 },
  sectionHead: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "#e5e5e5", borderBottomStyle: "solid" },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid" },
  label:       { color: "#555555", flex: 1 },
  value:       { fontFamily: "Helvetica-Bold", textAlign: "right" },
  kpiRow:      { flexDirection: "row", gap: 12, marginBottom: 16 },
  kpiBox:      { flex: 1, backgroundColor: "#f8f8f8", padding: 10, borderRadius: 4 },
  kpiLabel:    { fontSize: 8, color: "#888888", marginBottom: 3, textTransform: "uppercase" },
  kpiValue:    { fontSize: 14, fontFamily: "Helvetica-Bold" },
  initRow:     { marginBottom: 8, padding: 8, backgroundColor: "#f8f8f8", borderRadius: 4 },
  initName:    { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  initMeta:    { fontSize: 9, color: "#666666" },
  footer:      { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#aaaaaa" },
});

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { organizationId } = authenticate(req);
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        name: true, description: true, status: true, startDate: true, endDate: true,
        initiatives: {
          where: { deletedAt: null },
          select: {
            name: true, goal: true, status: true, endDate: true,
            financialEntries: { where: { deletedAt: null }, select: { amount: true } },
          },
        },
        financialEntries: { where: { deletedAt: null }, select: { description: true, amount: true, date: true, category: { select: { name: true } } } },
        financialExits:   { where: { deletedAt: null }, select: { description: true, amount: true, date: true, category: { select: { name: true } } } },
      },
    });

    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    const totalIn  = project.financialEntries.reduce((s, e) => s + Number(e.amount), 0);
    const totalOut = project.financialExits.reduce((s, e) => s + Number(e.amount), 0);
    const totalGoal = project.initiatives.reduce((s, i) => s + Number(i.goal), 0);

    const STATUS_PT: Record<string, string> = {
      ACTIVE: "Ativo", DRAFT: "Rascunho", COMPLETED: "Concluído", ARCHIVED: "Arquivado",
      PENDING: "Pendente", IN_PROGRESS: "Em Andamento", CANCELLED: "Cancelada",
    };

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{project.name}</Text>
            <Text style={styles.subtitle}>
              Relatório gerado em {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>

          {/* KPIs */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Arrecadado</Text>
              <Text style={styles.kpiValue}>{fmt(totalIn)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Despesas</Text>
              <Text style={styles.kpiValue}>{fmt(totalOut)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Saldo</Text>
              <Text style={styles.kpiValue}>{fmt(totalIn - totalOut)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Meta Total</Text>
              <Text style={styles.kpiValue}>{fmt(totalGoal)}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.section}>
            <Text style={styles.sectionHead}>Informações do Projeto</Text>
            <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.value}>{STATUS_PT[project.status] ?? project.status}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Início</Text><Text style={styles.value}>{fmtDate(project.startDate)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Encerramento</Text><Text style={styles.value}>{fmtDate(project.endDate)}</Text></View>
            {project.description ? <View style={[styles.row, { marginTop: 4 }]}><Text style={styles.label}>{project.description}</Text></View> : null}
          </View>

          {/* Initiatives */}
          {project.initiatives.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Iniciativas ({project.initiatives.length})</Text>
              {project.initiatives.map((init, i) => {
                const raised = init.financialEntries.reduce((s, e) => s + Number(e.amount), 0);
                const goal = Number(init.goal);
                const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;
                return (
                  <View key={i} style={styles.initRow}>
                    <Text style={styles.initName}>{init.name}</Text>
                    <Text style={styles.initMeta}>
                      {STATUS_PT[init.status] ?? init.status}
                      {init.endDate ? `  ·  Prazo: ${fmtDate(init.endDate)}` : ""}
                      {`  ·  ${fmt(raised)} / ${fmt(goal)} (${pct}%)`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Entries */}
          {project.financialEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Entradas ({project.financialEntries.length})</Text>
              {project.financialEntries.map((e, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.label}>{e.description}{e.category?.name ? ` · ${e.category.name}` : ""}</Text>
                  <Text style={[styles.value, { color: "#16a34a" }]}>{fmt(Number(e.amount))}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Exits */}
          {project.financialExits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Despesas ({project.financialExits.length})</Text>
              {project.financialExits.map((e, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.label}>{e.description}{e.category?.name ? ` · ${e.category.name}` : ""}</Text>
                  <Text style={[styles.value, { color: "#dc2626" }]}>{fmt(Number(e.amount))}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.footer}>GestãoProjetos · Documento gerado automaticamente</Text>
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(doc);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-${id}.pdf"`,
      },
    });
  } catch (e) { return errorResponse(e); }
}
