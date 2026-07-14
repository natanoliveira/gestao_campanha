import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/service";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("refresh_token")?.value;
    if (!token) {
      return Response.json({ error: { code: "UNAUTHORIZED", message: "Refresh token ausente" } }, { status: 401 });
    }

    const result = await authService.refresh(token);

    const response = Response.json({ accessToken: result.accessToken });
    response.headers.set(
      "Set-Cookie",
      `refresh_token=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
