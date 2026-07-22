import { prisma } from "@/lib/prisma";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        organizationId: true,
        isMaster: true,
      },
    });
  },

  findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null, active: true },
      select: { id: true, name: true, email: true, role: true, organizationId: true, isMaster: true },
    });
  },
};
