import { financialRepository } from "./repository";
import { AppError } from "@/lib/errors";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

export const financialService = {
  listEntries: (projectId: string, orgId: string) => financialRepository.listEntries(projectId, orgId),

  createEntry(projectId: string, orgId: string, userId: string, dto: CreateFinancialEntryDTO) {
    return financialRepository.createEntry({ ...dto, projectId, organizationId: orgId, createdById: userId });
  },

  async removeEntry(id: string, projectId: string) {
    const e = await financialRepository.findEntry(id, projectId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteEntry(id);
  },

  listExits: (projectId: string, orgId: string) => financialRepository.listExits(projectId, orgId),

  createExit(projectId: string, orgId: string, userId: string, dto: CreateFinancialExitDTO) {
    return financialRepository.createExit({ ...dto, projectId, organizationId: orgId, createdById: userId });
  },

  async removeExit(id: string, projectId: string) {
    const e = await financialRepository.findExit(id, projectId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteExit(id);
  },
};
