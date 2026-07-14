import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import { AppError } from "@/lib/errors";

export function authenticate(req: NextRequest): JwtPayload {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new AppError("Token ausente", 401, "UNAUTHORIZED");
  }
  try {
    return verifyAccessToken(auth.replace("Bearer ", ""));
  } catch {
    throw new AppError("Token inválido ou expirado", 401, "UNAUTHORIZED");
  }
}
