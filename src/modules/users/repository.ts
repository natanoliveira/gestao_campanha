import { prisma } from "@/lib/prisma";
import type { CreateUserDTO, UpdateUserDTO, ListUsersDTO } from "./dto";

const select = { id: true, name: true, email: true, role: true, active: true, createdAt: true, organizationId: true };

export const userRepository = {
  findById(id: string, organizationId: string) {
    return prisma.user.findFirst({ where: { id, organizationId, deletedAt: null }, select });
  },

  async list(organizationId: string, params: ListUsersDTO) {
    const where = {
      organizationId,
      ...(!params.showDeleted && { deletedAt: null }),
      ...(params.role && { role: params.role }),
      ...(params.active !== undefined && { active: params.active }),
    };
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 20);
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, select, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
      prisma.user.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  create(data: CreateUserDTO & { organizationId: string; passwordHash: string }) {
    const { password: _, ...rest } = data as CreateUserDTO & { organizationId: string; passwordHash: string; password?: string };
    return prisma.user.create({ data: rest, select });
  },

  update(id: string, organizationId: string, data: UpdateUserDTO) {
    return prisma.user.update({ where: { id }, data, select });
  },

  softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  },
};
