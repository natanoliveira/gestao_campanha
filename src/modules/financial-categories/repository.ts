import { prisma } from "@/lib/prisma";
import type { CreateFinancialCategoryDTO, UpdateFinancialCategoryDTO } from "./dto";
import type { FinancialCategoryType } from "@/generated/prisma/client";

const select = { id: true, name: true, type: true, createdAt: true };

export const financialCategoryRepository = {
  list(organizationId: string, type?: FinancialCategoryType) {
    return prisma.financialCategory.findMany({
      where: { organizationId, deletedAt: null, ...(type ? { type } : {}) },
      select,
      orderBy: { name: "asc" },
    });
  },

  create(data: CreateFinancialCategoryDTO & { organizationId: string }) {
    return prisma.financialCategory.create({ data, select });
  },

  findById(id: string, organizationId: string) {
    return prisma.financialCategory.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true },
    });
  },

  update(id: string, data: UpdateFinancialCategoryDTO) {
    return prisma.financialCategory.update({ where: { id }, data, select });
  },

  softDelete(id: string) {
    return prisma.financialCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  reportEntries(projectId: string, organizationId: string) {
    return prisma.financialEntry.groupBy({
      by: ["categoryId"],
      where: { projectId, organizationId, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });
  },

  reportExits(projectId: string, organizationId: string) {
    return prisma.financialExit.groupBy({
      by: ["categoryId"],
      where: { projectId, organizationId, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });
  },
};
