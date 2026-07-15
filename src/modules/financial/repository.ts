import { prisma } from "@/lib/prisma";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

const entrySelect = {
  id: true, description: true, amount: true, date: true,
  category: true, initiativeId: true, deletedAt: true,
};
const exitSelect = {
  id: true, description: true, amount: true, date: true,
  category: true, supplier: true, initiativeId: true, deletedAt: true,
};

export const financialRepository = {
  listEntries(projectId: string, organizationId: string) {
    return prisma.financialEntry.findMany({
      where: { projectId, organizationId, deletedAt: null },
      select: entrySelect,
      orderBy: { date: "desc" },
    });
  },

  createEntry(data: CreateFinancialEntryDTO & { projectId: string; organizationId: string; createdById: string }) {
    return prisma.financialEntry.create({ data: { ...data, date: new Date(data.date) }, select: entrySelect });
  },

  findEntry(id: string, projectId: string) {
    return prisma.financialEntry.findFirst({ where: { id, projectId, deletedAt: null }, select: { id: true } });
  },

  softDeleteEntry(id: string) {
    return prisma.financialEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  listExits(projectId: string, organizationId: string) {
    return prisma.financialExit.findMany({
      where: { projectId, organizationId, deletedAt: null },
      select: exitSelect,
      orderBy: { date: "desc" },
    });
  },

  createExit(data: CreateFinancialExitDTO & { projectId: string; organizationId: string; createdById: string }) {
    return prisma.financialExit.create({ data: { ...data, date: new Date(data.date) }, select: exitSelect });
  },

  findExit(id: string, projectId: string) {
    return prisma.financialExit.findFirst({ where: { id, projectId, deletedAt: null }, select: { id: true } });
  },

  softDeleteExit(id: string) {
    return prisma.financialExit.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
