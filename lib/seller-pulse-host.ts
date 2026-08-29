import { CANONICAL_MARKETING_HOST, normalizeHostname } from "./canonical-host";

/** Customer booking / intake paths — must keep working on effiroad.com for SMS links. */
export const CUSTOMER_PORTAL_PREFIXES = [
  "/r/",
  "/t/",
  "/go/",
  "/intake/",
  "/portal",
  "/agreement-offer/",
  "/e/",
  "/api/intake-link/",
  "/api/track/",
  "/api/correction/",
  "/api/agreement-offer/",
  "/api/places/",
];

/**
 * Effiroad dispatch marketing UI — local dev only when EFFIROAD_DISPATCH_ENABLED=1.
 *
 * ⚠️ `/settings`는 여기 없다. 자비스가 apex를 서비스하는 지금은 `/settings`가
 * 자비스의 연동 설정 화면이다 — 여기 넣으면 sellerPulseInternalPath까지
 * 가보지도 못하고 404로 막혀버린다(실제로 배포 후 이 버그가 났다).
 */
const LEGACY_EFFIROAD_UI_PREFIXES = [
  "/pricing",
  "/signup",
  "/onboarding",
  "/quote",
  "/hvac",
  "/restoration",
  "/demo",
  "/closeping",
  "/get-started",
  "/pay",
  "/sourcing",
  "/matchcut",
  "/trading",
  "/widget",
  "/terms",
  "/privacy",
  "/refund",
  "/forgot-password",
];

export function isSellerPulsePrimaryHost(host: string | null | undefined): boolean {
  return normalizeHostname(host) === CANONICAL_MARKETING_HOST;
}

/** When true, effiroad.com serves legacy dispatch UI at / (local dev). */
export function isEffiroadDispatchEnabled(): boolean {
  const v = process.env.EFFIROAD_DISPATCH_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isCustomerPortalPath(pathname: string): boolean {
  return CUSTOMER_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function isLegacyEffiroadUiPath(pathname: string): boolean {
  return LEGACY_EFFIROAD_UI_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 공개 주소 → 내부 파일 경로.
 *
 * ★ 자비스(`/jarvis/*`)가 화면을 맡는다
 *
 * 옛 대시보드(`/toss-shop/dashboard/*`)는 메뉴가 11개였는데 실제로 쓰는 건
 * 셋뿐이었고, 무엇보다 **옛 엔진이 만든 초안이 그대로 남아 있는 화면**이라
 * 고친 기준이 소급 적용되지 않았다(판매가 2,700만원짜리가 계속 떴다).
 * 새 화면은 저장소 자체가 달라서 그 오염이 넘어오지 않는다.
 *
 * 로그인도 자비스 것을 쓴다. 옛 로그인은 `toss-shop/lib/store.ts`(2,876줄)를
 * 거쳤고 그 store.ts가 옛 엔진 전체를 import해서, **비밀번호 한 번 확인하려고
 * 옛 파일 106개가 통째로 딸려오는** 구조였다 — 옛 것을 지우려면 끊어야 했다.
 */
export function sellerPulseInternalPath(pathname: string): string | null {
  if (pathname === "/") return "/jarvis";
  if (pathname === "/review" || pathname.startsWith("/review/")) {
    return "/jarvis/review";
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "/jarvis/settings";
  }
  // `/jarvis/login`이 아니라 `/jarvis-login`이다 — 자비스 layout이 소유자가
  // 아니면 로그인으로 돌려보내므로, 로그인 화면이 그 layout 아래 있으면
  // 무한 루프가 된다.
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return "/jarvis-login";
  }
  return null;
}

/**
 * 옛 대시보드 주소인가 — 자비스 홈으로 돌려보낼 대상.
 *
 * 문자로 받은 옛 링크(`/dashboard/review`)를 눌렀을 때 404가 뜨면
 * 사장님은 서비스가 깨진 줄 안다. 홈으로 보내 이어서 쓰게 한다.
 */
export function isRetiredDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function sellerPulseAtRoot(): boolean {
  return process.env.NEXT_PUBLIC_SELLER_PULSE_AT_ROOT === "1";
}
