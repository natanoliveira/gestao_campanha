import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  logo: z.string().url().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.extend({
  pixKey:       z.string().max(200).optional().nullable(),
  whatsapp:     z.string().max(20).optional().nullable(),
  pixQrCodeUrl: z.string().url().optional().nullable(),
}).partial();

export type CreateOrganizationDTO = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDTO = z.infer<typeof updateOrganizationSchema>;
