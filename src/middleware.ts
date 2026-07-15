import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/p/", "/api/v1/auth/", "/api/v1/public/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // page navigation não envia headers — usa cookie de refresh_token como sinal de autenticação
  const hasSession = req.cookies.has("refresh_token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
