import { prisma } from "@/lib/prisma";
import type { CreateInitiativeDTO, UpdateInitiativeDTO, ListInitiativesDTO } from "./dto";

const select = {
  id: true, projectId: true, organizationId: true,
  name: true, description: true,
  goal: true, minGoal: true, raised: true,
  priority: true, status: true,
  responsibleId: true, dependsOnId: true,
  createdAt: true, deletedAt: true,
};

export const initiativeRepository = {
  findById(id: string, projectId: string) {
    return prisma.initiative.findFirst({ where: { id, projectId, deletedAt: null }, select });
  },

  async list(projectId: string, params: ListInitiativesDTO) {
    const where = {
      projectId,
      ...(!params.showDeleted && { deletedAt: null }),
      ...(params.status && { status: params.status }),
      ...(params.q && { name: { contains: params.q, mode: "insensitive" as const } }),
    };
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(100, params.limit ?? 50);
    const [data, total] = await Promise.all([
      prisma.initiative.findMany({
        where, select,
        skip: (page - 1) * limit, take: limit,
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      }),
      prisma.initiative.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  create(data: CreateInitiativeDTO & { projectId: string; organizationId: string }) {
    return prisma.initiative.create({ data, select });
  },

  update(id: string, data: UpdateInitiativeDTO) {
    return prisma.initiative.update({ where: { id }, data, select });
  },

  softDelete(id: string) {
    return prisma.initiative.update({ where: { id }, data: { deletedAt: new Date() }, select });
  },
};
