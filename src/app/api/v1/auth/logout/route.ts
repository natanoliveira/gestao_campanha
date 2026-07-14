import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { authService } from "@/modules/auth/service";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    if (auth) {
      const payload = verifyAccessToken(auth);
      await authService.logout(payload.userId);
    }

    const response = Response.json({ message: "Logout realizado" });
    response.headers.set("Set-Cookie", "refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
