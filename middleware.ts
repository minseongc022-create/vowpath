import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import { isPortalHost } from "@/lib/portal-url";

const protectedPaths = ["/dashboard", "/onboarding", "/settings"];

/** Customer portal paths — safe on portal/app subdomains (no marketing homepage). */
const portalPublicPrefixes = ["/r/", "/intake/", "/portal", "/api/intake-link/", "/api/correction/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const portalHost = isPortalHost(host);

  if (portalHost && pathname === "/") {
    return NextResponse.rewrite(new URL("/portal", request.url));
  }

  if (portalHost) {
    const allowed =
      portalPublicPrefixes.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon");
    if (!allowed && !pathname.match(/\.(ico|png|jpg|svg|webp)$/)) {
      return NextResponse.rewrite(new URL("/portal", request.url));
    }
  }

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
  matcher: [
    "/((?!_next/static|_next/image).*)",
  ],
};
