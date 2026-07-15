import { prisma } from "@/lib/prisma";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

const catSelect = { select: { id: true, name: true } };

const entrySelect = {
  id: true, description: true, amount: true, date: true,
  categoryId: true, deletedAt: true,
  category: catSelect,
};

const exitSelect = {
  id: true, description: true, amount: true, date: true,
  categoryId: true, supplier: true, deletedAt: true,
  category: catSelect,
};

export const financialRepository = {
  listEntries(initiativeId: string, organizationId: string) {
    return prisma.financialEntry.findMany({
      where: { initiativeId, organizationId, deletedAt: null },
      select: entrySelect,
      orderBy: { date: "desc" },
    });
  },

  createEntry(data: CreateFinancialEntryDTO & { projectId: string; initiativeId: string; organizationId: string; createdById: string }) {
    return prisma.financialEntry.create({ data: { ...data, date: new Date(data.date) }, select: entrySelect });
  },

  findEntry(id: string, initiativeId: string) {
    return prisma.financialEntry.findFirst({ where: { id, initiativeId, deletedAt: null }, select: { id: true } });
  },

  softDeleteEntry(id: string) {
    return prisma.financialEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  listExits(initiativeId: string, organizationId: string) {
    return prisma.financialExit.findMany({
      where: { initiativeId, organizationId, deletedAt: null },
      select: exitSelect,
      orderBy: { date: "desc" },
    });
  },

  createExit(data: CreateFinancialExitDTO & { projectId: string; initiativeId: string; organizationId: string; createdById: string }) {
    return prisma.financialExit.create({ data: { ...data, date: new Date(data.date) }, select: exitSelect });
  },

  findExit(id: string, initiativeId: string) {
    return prisma.financialExit.findFirst({ where: { id, initiativeId, deletedAt: null }, select: { id: true } });
  },

  softDeleteExit(id: string) {
    return prisma.financialExit.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
