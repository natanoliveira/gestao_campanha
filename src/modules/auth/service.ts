import bcrypt from "bcryptjs";
import { redis } from "@/lib/redis";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { AppError } from "@/lib/errors";
import { authRepository } from "./repository";
import type { LoginDTO } from "./dto";

const REFRESH_PREFIX = "refresh:";

export const authService = {
  async login(dto: LoginDTO, organizationId: string) {
    const user = await authRepository.findByEmail(dto.email, organizationId);
    if (!user) throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");

    const payload = { userId: user.id, organizationId: user.organizationId, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await redis.set(`${REFRESH_PREFIX}${user.id}`, refreshToken, "EX", 60 * 60 * 24 * 7);

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  },

  async refresh(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError("Token inválido", 401, "UNAUTHORIZED");
    }

    const stored = await redis.get(`${REFRESH_PREFIX}${payload.userId}`);
    if (stored !== token) throw new AppError("Token revogado", 401, "UNAUTHORIZED");

    const user = await authRepository.findById(payload.userId);
    if (!user) throw new AppError("Usuário não encontrado", 401, "UNAUTHORIZED");

    const newPayload = { userId: user.id, organizationId: user.organizationId, role: user.role };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await redis.set(`${REFRESH_PREFIX}${user.id}`, refreshToken, "EX", 60 * 60 * 24 * 7);

    return { accessToken, refreshToken };
  },

  async logout(userId: string) {
    await redis.del(`${REFRESH_PREFIX}${userId}`);
  },
};
