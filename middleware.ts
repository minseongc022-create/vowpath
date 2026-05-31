import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

const protectedPaths = ["/dashboard", "/onboarding", "/settings"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/settings/:path*", "/login", "/signup", "/forgot-password"],
};
