import { prisma } from "@/lib/prisma";
import type { CreateOrganizationDTO, UpdateOrganizationDTO } from "./dto";

const select = { id: true, name: true, slug: true, logo: true, active: true, createdAt: true };

export const organizationRepository = {
  findById(id: string) {
    return prisma.organization.findFirst({ where: { id, deletedAt: null }, select });
  },

  findBySlug(slug: string) {
    return prisma.organization.findFirst({ where: { slug, deletedAt: null }, select });
  },

  create(data: CreateOrganizationDTO) {
    return prisma.organization.create({ data, select });
  },

  update(id: string, data: UpdateOrganizationDTO) {
    return prisma.organization.update({ where: { id }, data, select });
  },
};
