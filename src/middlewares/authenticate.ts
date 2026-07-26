import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import { AppError } from "@/lib/errors";

export function authenticate(req: NextRequest): JwtPayload {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new AppError("Token ausente", 401, "UNAUTHORIZED");
  }
  try {
    const payload = verifyAccessToken(auth.replace("Bearer ", ""));
    if (payload.isMaster) {
      const orgOverride = req.headers.get("x-organization-id");
      if (orgOverride) {
        console.warn(`[AUDIT] master ${payload.userId} acessando org ${orgOverride}`);
        payload.organizationId = orgOverride;
      }
    }
    return payload;
  } catch {
    throw new AppError("Token inválido ou expirado", 401, "UNAUTHORIZED");
  }
}
