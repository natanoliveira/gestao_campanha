import { NextRequest } from "next/server";
import { loginSchema } from "@/modules/auth/dto";
import { authService } from "@/modules/auth/service";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = loginSchema.parse(body);

    // ponytail: organizationId via header por enquanto; adicionar resolução por slug quando multi-tenant UI estiver pronta
    const organizationId = req.headers.get("x-organization-id");
    if (!organizationId) {
      return Response.json({ error: { code: "BAD_REQUEST", message: "x-organization-id obrigatório" } }, { status: 400 });
    }

    const result = await authService.login(dto, organizationId);

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
