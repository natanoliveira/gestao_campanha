import { initiativeRepository } from "./repository";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { CreateInitiativeDTO, UpdateInitiativeDTO, ListInitiativesDTO } from "./dto";

export const initiativeService = {
  async list(projectId: string, organizationId: string, params: ListInitiativesDTO) {
    const result = await initiativeRepository.list(projectId, organizationId, params);
    return {
      ...result,
      data: result.data.map(({ entries, ...init }) => ({
        ...init,
        raised: entries.reduce((s, e) => s + Number(e.amount), 0),
      })),
    };
  },

  async findById(id: string, projectId: string, organizationId: string) {
    const initiative = await initiativeRepository.findById(id, projectId, organizationId);
    if (!initiative) throw new AppError("Iniciativa não encontrada", 404, "NOT_FOUND");
    const raised = initiative.entries.reduce((s, e) => s + Number(e.amount), 0);
    const spent  = initiative.exits.reduce((s, e) => s + Number(e.amount), 0);
    return { ...initiative, raised, spent };
  },

  async create(projectId: string, organizationId: string, dto: CreateInitiativeDTO) {
    if (dto.dependsOnId) {
      const dep = await prisma.initiative.findFirst({
        where: { id: dto.dependsOnId, projectId, organizationId, deletedAt: null },
      });
      if (!dep) throw new AppError("Iniciativa de dependência não encontrada neste projeto", 400, "BAD_REQUEST");
    }
    if (dto.responsibleId) {
      const user = await prisma.user.findFirst({
        where: { id: dto.responsibleId, organizationId, deletedAt: null },
      });
      if (!user) throw new AppError("Responsável não encontrado nesta organização", 400, "BAD_REQUEST");
    }
    const initiative = await initiativeRepository.create({ ...dto, projectId, organizationId });
    const raised = initiative.entries.reduce((s, e) => s + Number(e.amount), 0);
    const spent  = initiative.exits.reduce((s, e) => s + Number(e.amount), 0);
    return { ...initiative, raised, spent };
  },

  async update(id: string, projectId: string, organizationId: string, dto: UpdateInitiativeDTO) {
    await this.findById(id, projectId, organizationId);
    if (dto.dependsOnId) {
      if (dto.dependsOnId === id) throw new AppError("Uma iniciativa não pode depender de si mesma", 400, "BAD_REQUEST");
      const dep = await prisma.initiative.findFirst({
        where: { id: dto.dependsOnId, projectId, organizationId, deletedAt: null },
      });
      if (!dep) throw new AppError("Iniciativa de dependência não encontrada neste projeto", 400, "BAD_REQUEST");
    }
    if (dto.responsibleId) {
      const user = await prisma.user.findFirst({
        where: { id: dto.responsibleId, organizationId, deletedAt: null },
      });
      if (!user) throw new AppError("Responsável não encontrado nesta organização", 400, "BAD_REQUEST");
    }
    const initiative = await initiativeRepository.update(id, dto);
    const raised = initiative.entries.reduce((s, e) => s + Number(e.amount), 0);
    const spent  = initiative.exits.reduce((s, e) => s + Number(e.amount), 0);
    return { ...initiative, raised, spent };
  },

  async remove(id: string, projectId: string, organizationId: string) {
    await this.findById(id, projectId, organizationId);
    return initiativeRepository.softDelete(id);
  },
};
