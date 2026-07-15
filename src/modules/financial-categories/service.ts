import { AppError } from "@/lib/errors";
import { financialCategoryRepository } from "./repository";
import type { CreateFinancialCategoryDTO, UpdateFinancialCategoryDTO } from "./dto";
import type { FinancialCategoryType } from "@/generated/prisma/client";

async function buildReport(
  rows: { categoryId: string | null; _sum: { amount: unknown }; _count: { id: number } }[],
  organizationId: string,
  type: FinancialCategoryType,
) {
  const cats = await financialCategoryRepository.list(organizationId, type);
  const catMap = new Map(cats.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    categoryId:   r.categoryId,
    categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? "Removida") : null,
    total:        Number(r._sum.amount ?? 0),
    count:        r._count.id,
  }));
}

export const financialCategoryService = {
  list(organizationId: string, type?: FinancialCategoryType) {
    return financialCategoryRepository.list(organizationId, type);
  },

  create(organizationId: string, dto: CreateFinancialCategoryDTO) {
    return financialCategoryRepository.create({ ...dto, organizationId });
  },

  async update(id: string, organizationId: string, dto: UpdateFinancialCategoryDTO) {
    const cat = await financialCategoryRepository.findById(id, organizationId);
    if (!cat) throw new AppError("Categoria não encontrada", 404, "NOT_FOUND");
    return financialCategoryRepository.update(id, dto);
  },

  async remove(id: string, organizationId: string) {
    const cat = await financialCategoryRepository.findById(id, organizationId);
    if (!cat) throw new AppError("Categoria não encontrada", 404, "NOT_FOUND");
    await financialCategoryRepository.softDelete(id);
  },

  async reportEntries(projectId: string, organizationId: string) {
    const rows = await financialCategoryRepository.reportEntries(projectId, organizationId);
    return buildReport(rows, organizationId, "ENTRY");
  },

  async reportExits(projectId: string, organizationId: string) {
    const rows = await financialCategoryRepository.reportExits(projectId, organizationId);
    return buildReport(rows, organizationId, "EXIT");
  },
};
