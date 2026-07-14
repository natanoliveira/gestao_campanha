import { prisma } from "@/lib/prisma";

export const authRepository = {
  findByEmail(email: string, organizationId: string) {
    return prisma.user.findFirst({
      where: { email, organizationId, deletedAt: null, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        organizationId: true,
      },
    });
  },

  findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null, active: true },
      select: { id: true, name: true, email: true, role: true, organizationId: true },
    });
  },
};
