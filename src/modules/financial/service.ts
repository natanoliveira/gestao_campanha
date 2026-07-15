import { financialRepository } from "./repository";
import { financialCategoryRepository } from "@/modules/financial-categories/repository";
import { AppError } from "@/lib/errors";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

export const financialService = {
  listEntries: (initiativeId: string, orgId: string) =>
    financialRepository.listEntries(initiativeId, orgId),

  async createEntry(projectId: string, initiativeId: string, orgId: string, userId: string, dto: CreateFinancialEntryDTO) {
    if (dto.categoryId) {
      const cat = await financialCategoryRepository.findById(dto.categoryId, orgId);
      if (!cat) throw new AppError("Categoria não encontrada", 404, "NOT_FOUND");
    }
    return financialRepository.createEntry({ ...dto, projectId, initiativeId, organizationId: orgId, createdById: userId });
  },

  async removeEntry(id: string, initiativeId: string, orgId: string) {
    const e = await financialRepository.findEntry(id, initiativeId, orgId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteEntry(id);
  },

  listExits: (initiativeId: string, orgId: string) =>
    financialRepository.listExits(initiativeId, orgId),

  async createExit(projectId: string, initiativeId: string, orgId: string, userId: string, dto: CreateFinancialExitDTO) {
    if (dto.categoryId) {
      const cat = await financialCategoryRepository.findById(dto.categoryId, orgId);
      if (!cat) throw new AppError("Categoria não encontrada", 404, "NOT_FOUND");
    }
    return financialRepository.createExit({ ...dto, projectId, initiativeId, organizationId: orgId, createdById: userId });
  },

  async removeExit(id: string, initiativeId: string, orgId: string) {
    const e = await financialRepository.findExit(id, initiativeId, orgId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteExit(id);
  },
};
