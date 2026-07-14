import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookieOptions, SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import {
  buildCanonicalRedirectUrl,
  normalizeHostname,
} from "@/lib/canonical-host";
import { isPortalHost } from "@/lib/portal-url";
import { safeNextPath } from "@/lib/safe-next-path";

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

function loginRedirect(request: NextRequest, nextPath?: string | null) {
  const login = new URL("/login", request.url);
  const next = safeNextPath(nextPath ?? null);
  if (next) login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

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
  const jwtSession = token ? await verifySessionToken(token) : null;

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Force re-login when an API 401 sent the user here with a stale cookie.
  if (pathname === "/login" && request.nextUrl.searchParams.get("reauth") === "1") {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const login = new URL("/login", request.url);
    if (next) login.searchParams.set("next", next);
    const res = NextResponse.redirect(login);
    res.cookies.set(clearSessionCookieOptions());
    return res;
  }

  if (isProtected && !jwtSession) {
    return loginRedirect(request, `${pathname}${request.nextUrl.search}`);
  }

  if (jwtSession) {
    if (pathname === "/settings" || pathname.startsWith("/settings/")) {
      const dest = new URL("/dashboard/settings", request.url);
      dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest, 308);
    }
    if (pathname === "/onboarding") {
      const dest = new URL("/dashboard/settings", request.url);
      dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest, 308);
    }
    if (pathname === "/" || pathname === "/login") {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
    }
    if (pathname === "/signup" && !request.nextUrl.searchParams.has("invite")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp|txt|xml|json|webmanifest|mp4|mp3|woff2|html)$).*)",
  ],
};
