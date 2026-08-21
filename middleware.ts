import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookieOptions, SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";
import {
  buildCanonicalRedirectUrl,
  isDecommissionedHost,
  normalizeHostname,
} from "@/lib/canonical-host";
import { isPortalHost } from "@/lib/portal-url";
import { safeNextPath } from "@/lib/safe-next-path";
import {
  giuInternalPath,
  giuPublicRedirectPath,
  isGiuHost,
} from "@/giu/lib/giu-host";
import { isLearnHost, learnInternalPath } from "@/learn/lib/learn-host";

const protectedPaths = ["/dashboard", "/onboarding", "/settings"];

/** Customer portal paths — safe on portal/app subdomains (no marketing homepage). */
const portalPublicPrefixes = [
  "/r/",
  "/t/",
  "/go/",
  "/intake/",
  "/portal",
  "/agreement-offer/",
  "/api/intake-link/",
  "/api/track/",
  "/api/correction/",
  "/api/agreement-offer/",
  // Address autocomplete + details for link intake on link.effiroad.com
  "/api/places/",
];

function isBrowserDocumentRequest(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  const secFetchDest = request.headers.get("sec-fetch-dest");
  if (secFetchDest === "document") return true;
  return accept.includes("text/html") && !accept.includes("application/json");
}

function loginRedirect(request: NextRequest, nextPath?: string | null) {
  const login = new URL("/login", request.url);
  const next = safeNextPath(nextPath ?? null);
  if (next) login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

function learnShellResponse(request: NextRequest, rewritePath?: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-shell", "learn");
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (rewritePath) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

const TOPIK_LOCALE_COOKIE = "topik-locale";

function giuShellResponse(request: NextRequest, rewritePath?: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-shell", "giu");
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (rewritePath) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function topikShellResponse(request: NextRequest, locale?: "ko" | "vi") {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-shell", "topik");
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (locale) requestHeaders.set("x-topik-locale", locale);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (locale) {
    res.cookies.set(TOPIK_LOCALE_COOKIE, locale, {
      path: "/topik",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}

function handleTopikLocale(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  const lang = searchParams.get("lang") ?? searchParams.get("locale");

  if (lang === "ko" || lang === "vi") {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    url.searchParams.delete("locale");
    const res = NextResponse.redirect(url);
    res.cookies.set(TOPIK_LOCALE_COOKIE, lang, {
      path: "/topik",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  if (pathname === "/topik/ko" || pathname.startsWith("/topik/ko/")) {
    const rest = pathname.slice("/topik/ko".length) || "";
    const url = request.nextUrl.clone();
    url.pathname = `/topik${rest}`;
    url.searchParams.delete("lang");
    url.searchParams.delete("locale");
    const res = NextResponse.redirect(url, 307);
    res.cookies.set(TOPIK_LOCALE_COOKIE, "ko", {
      path: "/topik",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  const cookieLocale = request.cookies.get(TOPIK_LOCALE_COOKIE)?.value;
  if (cookieLocale === "ko" || cookieLocale === "vi") {
    return topikShellResponse(request, cookieLocale);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const hostname = normalizeHostname(host);

  // learn.effiroad.com → Lane only (no Effiroad dispatch chrome or auth gates).
  if (isLearnHost(hostname)) {
    const internal = learnInternalPath(pathname);
    return learnShellResponse(request, internal === pathname ? undefined : internal ?? undefined);
  }

  // giucuu.com → Giu only (food rescue HCMC), isolated from Effiroad.
  if (isGiuHost(hostname)) {
    // Never rewrite/redirect static assets — avoids broken CSS on www vs apex.
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|txt|xml|json|webmanifest)$/)
    ) {
      return NextResponse.next();
    }
    // Health JSON is for deploy checks — browser visits should land in the app.
    if (pathname === "/api/giu/health" && isBrowserDocumentRequest(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/hop";
      url.search = "";
      return NextResponse.redirect(url, 302);
    }
    const publicPath = giuPublicRedirectPath(pathname);
    if (publicPath !== null) {
      const url = request.nextUrl.clone();
      url.pathname = publicPath;
      return NextResponse.redirect(url, 308);
    }
    const internal = giuInternalPath(pathname);
    if (internal === null) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return giuShellResponse(request, internal === pathname ? undefined : internal);
  }

  // Lane Learn — fully isolated product; skip Effiroad dispatch middleware entirely.
  if (pathname.startsWith("/learn")) {
    return learnShellResponse(request);
  }

  // TOPIK Master VN — isolated from Effiroad marketing shell and floating AI widget.
  if (pathname.startsWith("/topik")) {
    const localeHandled = handleTopikLocale(request);
    if (localeHandled) return localeHandled;
    return topikShellResponse(request);
  }

  // Mano — home services marketplace (Guadalajara), isolated product shell.
  if (pathname.startsWith("/mano")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-app-shell", "mano");
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Giu — food rescue marketplace (HCMC), isolated product shell.
  if (pathname.startsWith("/giu")) {
    return giuShellResponse(request);
  }

  // Toss Shop Insight — Toss Shopping seller tools, isolated product shell.
  if (pathname.startsWith("/toss-shop")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-app-shell", "toss-shop");
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isDecommissionedHost(hostname)) {
    if (pathname === "/robots.txt") {
      return new NextResponse("User-agent: *\nDisallow: /\n", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new NextResponse("This site is no longer available.", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "no-store",
      },
    });
  }

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
    if (pathname === "/login") {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
    }
    // Logged-in users normally land on the dashboard, but `?view=site` keeps the
    // public landing (and #pricing) reachable from the in-app "View plans" links.
    if (pathname === "/") {
      if (request.nextUrl.searchParams.get("view") === "site") {
        // allow through
      } else {
        const next = safeNextPath(request.nextUrl.searchParams.get("next"));
        return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
      }
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
