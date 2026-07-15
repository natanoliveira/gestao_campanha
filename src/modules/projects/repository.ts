import { prisma } from "@/lib/prisma";
import type { CreateProjectDTO, UpdateProjectDTO } from "./dto";

const initSelect = { id: true, name: true, goal: true, status: true, description: true, priority: true } as const;

export const projectRepository = {
  async list(organizationId: string, opts: { status?: string; q?: string; skip: number; take: number }) {
    const where = {
      organizationId,
      deletedAt: null,
      ...(opts.status && { status: opts.status as "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED" }),
      ...(opts.q && { name: { contains: opts.q, mode: "insensitive" as const } }),
    };
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: opts.skip,
        take: opts.take,
        select: {
          id: true, name: true, status: true, description: true, coverImage: true, isPublic: true, publicSlug: true, updatedAt: true,
          initiatives: { where: { deletedAt: null }, select: { goal: true, entries: { where: { deletedAt: null }, select: { amount: true } } } },
        },
      }),
      prisma.project.count({ where }),
    ]);
    return { data, total };
  },

  findById(id: string, organizationId: string) {
    return prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true, name: true, description: true, status: true, isPublic: true, publicSlug: true,
        startDate: true, endDate: true, createdAt: true, updatedAt: true,
        initiatives: {
          where: { deletedAt: null },
          orderBy: { priority: "asc" },
          select: initSelect,
        },
        timelinePosts: {
          where: { deletedAt: null },
          orderBy: { publishedAt: "desc" },
          take: 30,
          select: {
            id: true, content: true, type: true, publishedAt: true,
            author: { select: { name: true } },
          },
        },
        financialEntries: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: {
            id: true, description: true, amount: true, date: true,
            categoryId: true, initiativeId: true,
            category: { select: { id: true, name: true } },
            initiative: { select: { id: true, name: true } },
          },
        },
        financialExits: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: {
            id: true, description: true, amount: true, date: true,
            categoryId: true, supplier: true, initiativeId: true,
            category: { select: { id: true, name: true } },
            initiative: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  create(organizationId: string, userId: string, data: CreateProjectDTO) {
    return prisma.project.create({
      data: {
        ...data,
        organizationId,
        createdById: userId,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
      },
    });
  },

  update(id: string, data: UpdateProjectDTO) {
    return prisma.project.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
      },
    });
  },

  softDelete(id: string) {
    return prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
