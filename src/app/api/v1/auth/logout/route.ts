import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { authService } from "@/modules/auth/service";
import { AppError, errorResponse } from "@/lib/errors";

const CLEAR_COOKIE = "refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";

export async function POST(req: NextRequest) {
  // Always clear the cookie — revoke DB session as best-effort
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  try {
    if (auth) {
      const payload = verifyAccessToken(auth);
      await authService.logout(payload.userId, payload.organizationId);
    }
  } catch {
    // token invalid/expired — still clear the cookie below
  }

  const response = Response.json({ message: "Logout realizado" });
  response.headers.set("Set-Cookie", CLEAR_COOKIE);
  return response;
}
