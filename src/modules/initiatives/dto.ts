import { z } from "zod";

const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const createInitiativeSchema = z.object({
  name:          z.string().min(2).max(150),
  description:   z.string().optional(),
  goal:          z.coerce.number().positive(),
  minGoal:       z.coerce.number().positive().optional(),
  raised:        z.coerce.number().min(0).optional(),
  priority:      z.coerce.number().int().optional(),
  status:        z.enum(statuses).optional(),
  responsibleId: z.string().uuid().optional(),
  dependsOnId:   z.string().uuid().optional(),
});

export const updateInitiativeSchema = createInitiativeSchema.partial();

export const listInitiativesSchema = z.object({
  status:      z.enum(statuses).optional(),
  q:           z.string().optional(),
  showDeleted: z.coerce.boolean().optional(),
  page:        z.coerce.number().optional(),
  limit:       z.coerce.number().optional(),
});

export type CreateInitiativeDTO = z.infer<typeof createInitiativeSchema>;
export type UpdateInitiativeDTO = z.infer<typeof updateInitiativeSchema>;
export type ListInitiativesDTO  = z.infer<typeof listInitiativesSchema>;
