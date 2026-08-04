import { prisma } from "@/lib/prisma";
import type { CreateInitiativeDTO, UpdateInitiativeDTO, ListInitiativesDTO } from "./dto";

const baseSelect = {
  id: true, projectId: true, organizationId: true,
  name: true, description: true,
  goal: true, minGoal: true,
  priority: true, status: true, endDate: true,
  responsibleId: true, dependsOnId: true,
  createdAt: true, deletedAt: true,
  createdBy: { select: { id: true, name: true } },
};

export const initiativeRepository = {
  findById(id: string, projectId: string, organizationId: string) {
    return prisma.initiative.findFirst({
      where: { id, projectId, organizationId, deletedAt: null },
      select: {
        ...baseSelect,
        entries:  { where: { deletedAt: null }, select: { amount: true } },
        exits:    { where: { deletedAt: null }, select: { amount: true } },
        pledges:  { select: { amount: true } },
      },
    });
  },

  async list(projectId: string, organizationId: string, params: ListInitiativesDTO) {
    const where = {
      projectId,
      organizationId,
      ...(!params.showDeleted && { deletedAt: null }),
      ...(params.status && { status: params.status }),
      ...(params.q && { name: { contains: params.q, mode: "insensitive" as const } }),
    };
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(100, params.limit ?? 50);
    const [data, total] = await Promise.all([
      prisma.initiative.findMany({
        where,
        select: {
          ...baseSelect,
          entries:  { where: { deletedAt: null }, select: { amount: true } },
          pledges:  { select: { amount: true } },
        },
        skip: (page - 1) * limit, take: limit,
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      }),
      prisma.initiative.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  create(data: Omit<CreateInitiativeDTO, "endDate"> & { projectId: string; organizationId: string; endDate?: Date; createdById: string }) {
    return prisma.initiative.create({
      data,
      select: {
        ...baseSelect,
        entries:  { where: { deletedAt: null }, select: { amount: true } },
        exits:    { where: { deletedAt: null }, select: { amount: true } },
        pledges:  { select: { amount: true } },
      },
    });
  },

  update(id: string, data: Omit<UpdateInitiativeDTO, "endDate"> & { endDate?: Date }) {
    return prisma.initiative.update({
      where: { id },
      data,
      select: {
        ...baseSelect,
        entries:  { where: { deletedAt: null }, select: { amount: true } },
        exits:    { where: { deletedAt: null }, select: { amount: true } },
        pledges:  { select: { amount: true } },
      },
    });
  },

  softDelete(id: string) {
    return prisma.initiative.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        ...baseSelect,
        entries: { where: { deletedAt: null }, select: { amount: true } },
        exits:   { where: { deletedAt: null }, select: { amount: true } },
      },
    });
  },
};
