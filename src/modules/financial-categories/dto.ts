import { z } from "zod";

export const createFinancialCategorySchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["ENTRY", "EXIT"]),
});

export const updateFinancialCategorySchema = z.object({
  name: z.string().min(1).max(80),
});

export type CreateFinancialCategoryDTO = z.infer<typeof createFinancialCategorySchema>;
export type UpdateFinancialCategoryDTO = z.infer<typeof updateFinancialCategorySchema>;
