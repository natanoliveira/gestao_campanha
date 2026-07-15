import { z } from "zod";

const types = ["TEXT", "PHOTO", "VIDEO", "PDF", "LINK"] as const;

export const createTimelinePostSchema = z.object({
  content:  z.string().min(1).max(2000),
  type:     z.enum(types).default("TEXT"),
  mediaUrl: z.string().url().optional(),
});

export type CreateTimelinePostDTO = z.infer<typeof createTimelinePostSchema>;
