import { z } from "zod";

const roles = ["ADMIN", "MANAGER", "TREASURER", "COMMUNICATION", "AUDITOR", "MEMBER"] as const;

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(roles).default("MEMBER"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(roles).optional(),
  active: z.boolean().optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  role: z.enum(roles).optional(),
  active: z.coerce.boolean().optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type ListUsersDTO = z.infer<typeof listUsersSchema>;
