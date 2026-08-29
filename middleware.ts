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
import { isLearnHost, learnInternalPath } from "@/learn/lib/learn-host";
import {
  isEffiroadDispatchEnabled,
  isLegacyEffiroadUiPath,
  isRetiredDashboardPath,
  isSellerPulsePrimaryHost,
  sellerPulseInternalPath,
} from "@/lib/seller-pulse-host";
import { isJarvisHost } from "@/jarvis/host";
import { isPublicJarvisPath } from "@/jarvis/core/gate";
import { isOwnerSession } from "@/jarvis/core/access";
import { JARVIS_SESSION_COOKIE, verifyJarvisSessionToken } from "@/jarvis/core/session";

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

function sellerPulseShellResponse(
  request: NextRequest,
  rewritePath: string,
  publicPath: string,
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-shell", "jarvis");
  requestHeaders.set("x-pathname", publicPath);
  const url = request.nextUrl.clone();
  url.pathname = rewritePath;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const hostname = normalizeHostname(host);

  // ★ 구쿠는 이 배포에서 완전히 빠졌다 — 어느 호스트에서도 안 열린다
  //
  // giucuu.com은 이제 자비스 자리다. 구쿠 코드 파일은 되살릴 수 있게 그대로
  // 두었지만(커밋 5c9df16 + tar 백업), **라우팅은 여기서 완전히 끊는다**.
  //
  // 호스트별 분기만으로는 부족하다: giucuu.com은 아래 자비스 분기가 잡고
  // effiroad.com은 텅 비었지만, **배포 자체의 주소(*.vercel.app)로 들어오면**
  // 두 분기 모두 걸리지 않고 흘러내려가 `/giu`·`/api/giu`가 그대로 열린다.
  // 그러면 옛 가맹점·고객이 그 주소로 계속 들어올 수 있고, 결제 웹훅도
  // 살아 있게 된다. 호스트와 무관하게 경로로 막는 이유다.
  if (pathname === "/giu" || pathname.startsWith("/giu/") || pathname.startsWith("/api/giu")) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  // learn.effiroad.com → Lane only (no Effiroad dispatch chrome or auth gates).
  if (isLearnHost(hostname)) {
    const internal = learnInternalPath(pathname);
    return learnShellResponse(request, internal === pathname ? undefined : internal ?? undefined);
  }

  // ★ giucuu.com → 자비스. 사장님 한 명만 쓰는 개인 자동화다.
  //
  // 예전엔 여기가 구쿠(음식 나눔)였고 자비스는 effiroad.com에 있었다.
  // effiroad.com은 그보다 더 예전에 미국 복원·냉난방 업체 전화를 대신 받던
  // AI 서비스 자리라, 그 시절 흔적(가입자·옛 링크·같은 키로 서명된 세션)이
  // 계속 얽혔다. 그래서 자비스를 이 도메인으로 통째로 옮기고 effiroad.com은
  // 아무것도 없는 상태로 비웠다. 구쿠 코드는 지우기 전에 따로 보존해 뒀다
  // (커밋 5c9df16).
  if (isJarvisHost(hostname)) {
    // 문 — 라우트에 닿기 전에 먼저 막는다. 화면·API마다 소유자 검사가
    // 있지만, 검사를 빠뜨린 라우트가 하나만 생겨도 자비스 전체가 뚫린다
    // (저장소가 가맹점별로 안 나뉜 전역 상태라 그렇다).
    if (!isPublicJarvisPath(pathname)) {
      const token = request.cookies.get(JARVIS_SESSION_COOKIE)?.value;
      const session = token ? await verifyJarvisSessionToken(token) : null;
      if (!isOwnerSession(session)) {
        // 로그인으로 돌려보내지 않는다 — 돌려보내면 그 경로에 뭔가 있다는
        // 걸 알려주는 셈이다. 없는 것처럼 보이는 편이 낫다.
        return new NextResponse(null, {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        });
      }
    }

    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|txt|xml|json|webmanifest)$/)
    ) {
      return NextResponse.next();
    }

    // 문자로 받아둔 옛 링크가 404가 뜨면 서비스가 깨진 줄 안다 — 홈으로 보낸다
    if (isRetiredDashboardPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url, 307);
    }

    const internal = sellerPulseInternalPath(pathname);
    if (internal) {
      return sellerPulseShellResponse(request, internal, pathname);
    }

    return new NextResponse(null, { status: 404 });
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

  const sellerPulseOwnsApex =
    isSellerPulsePrimaryHost(hostname) && !isEffiroadDispatchEnabled();

  // ★ effiroad.com → 텅 빈 도메인
  //
  // 이 도메인엔 두 시대의 흔적이 겹쳐 있었다 — 미국 복원·냉난방 업체 전화를
  // 대신 받던 AI 서비스, 그리고 옛 toss-shop 셀러 대시보드. 그 시절 가입자와
  // 옛 링크가 자비스와 계속 얽혀서, 자비스는 giucuu.com으로 옮기고 여기는
  // 아무것도 없는 상태로 비웠다.
  //
  // 리다이렉트하지 않는다 — 자비스가 어디로 갔는지 알려줄 이유가 없다.
  if (sellerPulseOwnsApex) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  // Effiroad 셀러 도구 (apex가 아닌 호스트에서는 /sellerpulse 밑).
  //
  // apex(effiroad.com)와 **같은 규칙**을 써야 한다. 한쪽만 자비스로 옮기면
  // 호스트에 따라 다른 화면이 뜨고, 문자로 보낸 링크가 어디서 열리느냐에
  // 따라 갈린다.
  if (pathname.startsWith("/sellerpulse")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-app-shell", "jarvis");
    requestHeaders.set("x-pathname", pathname);

    const publicPath = pathname.replace(/^\/sellerpulse/, "") || "/";

    if (isRetiredDashboardPath(publicPath)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sellerpulse";
      url.search = "";
      return NextResponse.redirect(url, 307);
    }

    const internal = sellerPulseInternalPath(publicPath);
    if (internal) {
      const url = request.nextUrl.clone();
      url.pathname = internal;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/toss-shop")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/toss-shop/, "/sellerpulse");
    return NextResponse.redirect(url, 308);
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
