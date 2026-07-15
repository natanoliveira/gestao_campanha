import { timelineRepository } from "./repository";
import { AppError } from "@/lib/errors";
import type { CreateTimelinePostDTO } from "./dto";

export const timelineService = {
  list(projectId: string, organizationId: string) {
    return timelineRepository.list(projectId, organizationId);
  },

  create(projectId: string, organizationId: string, authorId: string, dto: CreateTimelinePostDTO) {
    return timelineRepository.create({ ...dto, projectId, organizationId, authorId });
  },

  async remove(id: string, projectId: string) {
    const post = await timelineRepository.findById(id, projectId);
    if (!post) throw new AppError("Post não encontrado", 404, "NOT_FOUND");
    return timelineRepository.softDelete(id);
  },
};
