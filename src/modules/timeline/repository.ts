import { prisma } from "@/lib/prisma";
import type { CreateTimelinePostDTO } from "./dto";

const select = {
  id: true, content: true, type: true, mediaUrl: true,
  publishedAt: true, deletedAt: true,
  author: { select: { id: true, name: true } },
};

export const timelineRepository = {
  list(projectId: string, organizationId: string) {
    return prisma.timelinePost.findMany({
      where: { projectId, organizationId, deletedAt: null },
      select,
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
  },

  create(data: CreateTimelinePostDTO & { projectId: string; organizationId: string; authorId: string }) {
    return prisma.timelinePost.create({ data, select });
  },

  findById(id: string, projectId: string) {
    return prisma.timelinePost.findFirst({ where: { id, projectId, deletedAt: null }, select: { id: true } });
  },

  softDelete(id: string) {
    return prisma.timelinePost.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
