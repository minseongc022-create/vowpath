import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import {
  buildCanonicalRedirectUrl,
  normalizeHostname,
} from "@/lib/canonical-host";
import { isPortalHost } from "@/lib/portal-url";

const protectedPaths = ["/dashboard", "/onboarding", "/settings"];

/** Customer portal paths — safe on portal/app subdomains (no marketing homepage). */
const portalPublicPrefixes = [
  "/r/",
  "/intake/",
  "/portal",
  "/agreement-offer/",
  "/api/intake-link/",
  "/api/correction/",
  "/api/agreement-offer/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const hostname = normalizeHostname(host);

  const target = buildCanonicalRedirectUrl(hostname, pathname, request.nextUrl.search);
  if (target) {
    return NextResponse.redirect(target, 308);
  }

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

  if (session) {
    if (pathname === "/" || pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname === "/signup" && !request.nextUrl.searchParams.has("invite")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp|txt|xml|json|webmanifest|mp4|mp3|woff2)$).*)",
  ],
};
