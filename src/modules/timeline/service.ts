import { timelineRepository } from "./repository";
import { AppError } from "@/lib/errors";

export const timelineService = {
  async remove(id: string, projectId: string) {
    const post = await timelineRepository.findById(id, projectId);
    if (!post) throw new AppError("Post não encontrado", 404, "NOT_FOUND");
    return timelineRepository.softDelete(id);
  },
};
