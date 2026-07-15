import { initiativeRepository } from "./repository";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { CreateInitiativeDTO, UpdateInitiativeDTO, ListInitiativesDTO } from "./dto";

export const initiativeService = {
  list(projectId: string, params: ListInitiativesDTO) {
    return initiativeRepository.list(projectId, params);
  },

  async findById(id: string, projectId: string) {
    const init = await initiativeRepository.findById(id, projectId);
    if (!init) throw new AppError("Iniciativa não encontrada", 404, "NOT_FOUND");
    return init;
  },

  async create(projectId: string, organizationId: string, dto: CreateInitiativeDTO) {
    if (dto.dependsOnId) {
      const dep = await prisma.initiative.findFirst({
        where: { id: dto.dependsOnId, projectId, deletedAt: null },
      });
      if (!dep) throw new AppError("Iniciativa de dependência não encontrada neste projeto", 400, "BAD_REQUEST");
    }
    if (dto.responsibleId) {
      const user = await prisma.user.findFirst({
        where: { id: dto.responsibleId, organizationId, deletedAt: null },
      });
      if (!user) throw new AppError("Responsável não encontrado nesta organização", 400, "BAD_REQUEST");
    }
    return initiativeRepository.create({ ...dto, projectId, organizationId });
  },

  async update(id: string, projectId: string, organizationId: string, dto: UpdateInitiativeDTO) {
    await this.findById(id, projectId);
    if (dto.dependsOnId) {
      if (dto.dependsOnId === id) throw new AppError("Uma iniciativa não pode depender de si mesma", 400, "BAD_REQUEST");
      const dep = await prisma.initiative.findFirst({
        where: { id: dto.dependsOnId, projectId, deletedAt: null },
      });
      if (!dep) throw new AppError("Iniciativa de dependência não encontrada neste projeto", 400, "BAD_REQUEST");
    }
    if (dto.responsibleId) {
      const user = await prisma.user.findFirst({
        where: { id: dto.responsibleId, organizationId, deletedAt: null },
      });
      if (!user) throw new AppError("Responsável não encontrado nesta organização", 400, "BAD_REQUEST");
    }
    return initiativeRepository.update(id, dto);
  },

  async remove(id: string, projectId: string) {
    await this.findById(id, projectId);
    return initiativeRepository.softDelete(id);
  },
};
