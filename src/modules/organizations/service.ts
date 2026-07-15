import { AppError } from "@/lib/errors";
import { organizationRepository } from "./repository";
import type { CreateOrganizationDTO, UpdateOrganizationDTO } from "./dto";

export const organizationService = {
  async findById(id: string) {
    const org = await organizationRepository.findById(id);
    if (!org) throw new AppError("Organização não encontrada", 404, "NOT_FOUND");
    return org;
  },

  async create(data: CreateOrganizationDTO) {
    const existing = await organizationRepository.findBySlug(data.slug);
    if (existing) throw new AppError("Slug já em uso", 409, "CONFLICT");
    return organizationRepository.create(data);
  },

  async update(id: string, requestOrgId: string, data: UpdateOrganizationDTO) {
    if (id !== requestOrgId) throw new AppError("Acesso negado", 403, "FORBIDDEN");
    await this.findById(id);
    if (data.slug) {
      const existing = await organizationRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw new AppError("Slug já em uso", 409, "CONFLICT");
    }
    return organizationRepository.update(id, data);
  },
};
