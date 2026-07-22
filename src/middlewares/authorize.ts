import { can } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import type { JwtPayload } from "@/lib/jwt";

export function authorize(payload: JwtPayload, permission: string): void {
  if (!can(payload.role, permission)) {
    throw new AppError("Acesso negado", 403, "FORBIDDEN");
  }
}
