import { z } from "zod";

const base = z.object({
  description:  z.string().min(1).max(200),
  amount:       z.coerce.number().positive(),
  date:         z.string().datetime({ offset: true }),
  category:     z.string().max(80).optional(),
  initiativeId: z.string().uuid().optional(),
});

export const createFinancialEntrySchema = base;
export const createFinancialExitSchema  = base.extend({
  supplier: z.string().max(120).optional(),
});

export type CreateFinancialEntryDTO = z.infer<typeof createFinancialEntrySchema>;
export type CreateFinancialExitDTO  = z.infer<typeof createFinancialExitSchema>;
