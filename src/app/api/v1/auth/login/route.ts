import { NextRequest } from "next/server";
import { loginSchema } from "@/modules/auth/dto";
import { authService } from "@/modules/auth/service";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = loginSchema.parse(body);
    const result = await authService.login(dto);

    const response = Response.json({ user: result.user, accessToken: result.accessToken });
    response.headers.set(
      "Set-Cookie",
      `refresh_token=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
