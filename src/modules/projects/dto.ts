import { z } from "zod";

const statuses = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export const createProjectSchema = z.object({
  name:        z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  status:      z.enum(statuses).default("DRAFT"),
  isPublic:    z.boolean().default(false),
  publicSlug:  z.string().regex(/^[a-z0-9-]+$/).optional(),
  startDate:   z.string().datetime({ offset: true }).optional(),
  endDate:     z.string().datetime({ offset: true }).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const listProjectsSchema = z.object({
  status: z.enum(statuses).optional(),
  q:      z.string().optional(),
  page:   z.coerce.number().optional(),
  limit:  z.coerce.number().optional(),
});

export type CreateProjectDTO = z.infer<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;
export type ListProjectsDTO  = z.infer<typeof listProjectsSchema>;
