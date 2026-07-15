import { AppError } from "@/lib/errors";
import { parsePagination, paginatedResponse } from "@/lib/pagination";
import { projectRepository } from "./repository";
import type { CreateProjectDTO, UpdateProjectDTO, ListProjectsDTO } from "./dto";

export const projectService = {
  async list(organizationId: string, dto: ListProjectsDTO) {
    const { skip, take, page, limit } = parsePagination(dto);
    const { data, total } = await projectRepository.list(organizationId, { ...dto, skip, take });
    const mapped = data.map(p => ({
      ...p,
      initiatives: p.initiatives.map(i => ({
        ...i,
        raised: i.entries.reduce((s, e) => s + Number(e.amount), 0),
      })),
    }));
    return paginatedResponse(mapped, total, page, limit);
  },

  async getById(id: string, organizationId: string) {
    const project = await projectRepository.findById(id, organizationId);
    if (!project) throw new AppError("Projeto não encontrado", 404, "NOT_FOUND");
    return {
      ...project,
      initiatives: project.initiatives.map(i => ({
        ...i,
        raised: i.entries.reduce((s, e) => s + Number(e.amount), 0),
      })),
    };
  },

  async create(organizationId: string, userId: string, dto: CreateProjectDTO) {
    return projectRepository.create(organizationId, userId, dto);
  },

  async update(id: string, organizationId: string, dto: UpdateProjectDTO) {
    await projectService.getById(id, organizationId);
    return projectRepository.update(id, dto);
  },

  async delete(id: string, organizationId: string) {
    await projectService.getById(id, organizationId);
    return projectRepository.softDelete(id);
  },
};
