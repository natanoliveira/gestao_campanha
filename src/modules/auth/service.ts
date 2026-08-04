import bcrypt from "bcryptjs";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken, type RefreshPayload } from "@/lib/jwt";
import { AppError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { authRepository } from "./repository";
import type { LoginDTO } from "./dto";

const REFRESH_PREFIX = "refresh:";
const SESSION_TTL = 60 * 60 * 2; // 2h — limite absoluto de sessão
const MAX_SESSION_MS = SESSION_TTL * 1000;

export const authService = {
  async login(dto: LoginDTO, ip?: string) {
    const user = await authRepository.findByEmail(dto.email);
    if (!user) throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");

    const payload = { userId: user.id, organizationId: user.organizationId, role: user.role, isMaster: user.isMaster ?? false };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ ...payload, loginAt: Date.now() });

    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

    await Promise.all([
      redis.set(`${REFRESH_PREFIX}${user.id}`, refreshToken, "EX", SESSION_TTL),
      prisma.session.upsert({
        where: { token: refreshToken },
        create: { userId: user.id, token: refreshToken, expiresAt },
        update: { expiresAt },
      }),
      logAudit({ organizationId: user.organizationId, userId: user.id, action: "login", entity: "session", entityId: user.id, ip }),
    ]);

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, isMaster: user.isMaster ?? false } };
  },

  async refresh(token: string) {
    let payload: RefreshPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError("Token inválido", 401, "UNAUTHORIZED");
    }

    if (Date.now() - (payload.loginAt ?? 0) > MAX_SESSION_MS) {
      throw new AppError("Sessão expirada", 401, "UNAUTHORIZED");
    }

    const stored = await redis.get(`${REFRESH_PREFIX}${payload.userId}`);
    if (stored !== token) throw new AppError("Token revogado", 401, "UNAUTHORIZED");

    const user = await authRepository.findById(payload.userId);
    if (!user) throw new AppError("Usuário não encontrado", 401, "UNAUTHORIZED");

    const newPayload = { userId: user.id, organizationId: user.organizationId, role: user.role, isMaster: user.isMaster ?? false };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken({ ...newPayload, loginAt: payload.loginAt });

    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

    await Promise.all([
      redis.set(`${REFRESH_PREFIX}${user.id}`, refreshToken, "EX", SESSION_TTL),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.session.create({ data: { userId: user.id, token: refreshToken, expiresAt } }),
    ]);

    return { accessToken, refreshToken };
  },

  async logout(userId: string, organizationId: string | null) {
    await Promise.all([
      redis.del(`${REFRESH_PREFIX}${userId}`),
      prisma.session.deleteMany({ where: { userId } }),
      logAudit({ organizationId, userId, action: "logout", entity: "session", entityId: userId }),
    ]);
  },
};
