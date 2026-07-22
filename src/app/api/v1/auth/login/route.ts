import { NextRequest } from "next/server";
import { loginSchema } from "@/modules/auth/dto";
import { authService } from "@/modules/auth/service";
import { errorResponse } from "@/lib/errors";
import { rateLimit } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`login:${ip}`, 10, 60);
    if (!rl.ok) return Response.json({ message: "Muitas tentativas. Tente novamente em 1 minuto." }, { status: 429 });

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
