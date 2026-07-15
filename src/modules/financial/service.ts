import { financialRepository } from "./repository";
import { AppError } from "@/lib/errors";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

export const financialService = {
  listEntries: (initiativeId: string, orgId: string) =>
    financialRepository.listEntries(initiativeId, orgId),

  createEntry(projectId: string, initiativeId: string, orgId: string, userId: string, dto: CreateFinancialEntryDTO) {
    return financialRepository.createEntry({ ...dto, projectId, initiativeId, organizationId: orgId, createdById: userId });
  },

  async removeEntry(id: string, initiativeId: string) {
    const e = await financialRepository.findEntry(id, initiativeId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteEntry(id);
  },

  listExits: (initiativeId: string, orgId: string) =>
    financialRepository.listExits(initiativeId, orgId),

  createExit(projectId: string, initiativeId: string, orgId: string, userId: string, dto: CreateFinancialExitDTO) {
    return financialRepository.createExit({ ...dto, projectId, initiativeId, organizationId: orgId, createdById: userId });
  },

  async removeExit(id: string, initiativeId: string) {
    const e = await financialRepository.findExit(id, initiativeId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteExit(id);
  },
};
