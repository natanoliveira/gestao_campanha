import { AppError } from "@/lib/errors";
import type { JwtPayload } from "@/lib/jwt";

export function authorize(payload: JwtPayload, roles: string[]) {
  if (!roles.includes(payload.role)) {
    throw new AppError("Acesso negado", 403, "FORBIDDEN");
  }
}
