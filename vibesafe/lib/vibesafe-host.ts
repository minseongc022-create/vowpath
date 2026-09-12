import { normalizeHostname } from "@/lib/canonical-host";

/**
 * VibeSafe 전용 도메인.
 *
 * 다른 제품(하루위드 등)은 도메인을 코드에 박아뒀지만 VibeSafe는 아직 도메인을
 * 사지 않은 상태로 출시한다. 그래서 환경변수로 받는다 — 도메인이 생겼을 때
 * 코드 수정·재배포 없이 Vercel 환경변수만 추가하면 붙는다. 비워두면 메인
 * 도메인의 /vibesafe 경로에서만 동작하고, 그 상태로도 제품은 완전하다.
 */
function configuredHosts(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_VIBESAFE_HOSTS ?? process.env.VIBESAFE_HOSTS ?? "";
  return new Set(
    raw
      .split(",")
      .map((h) => normalizeHostname(h.trim()))
      .filter(Boolean),
  );
}

export function isVibesafeHost(host: string | null | undefined): boolean {
  const h = normalizeHostname(host);
  if (!h) return false;
  return configuredHosts().has(h);
}

/** 전용 도메인의 `/` 를 내부 `/vibesafe` 로 접어 넣는다. */
export function vibesafeInternalPath(pathname: string): string {
  if (pathname.startsWith("/vibesafe")) return pathname;
  if (pathname.startsWith("/api/vibesafe")) return pathname;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return pathname;
  if (/\.(ico|png|jpg|jpeg|svg|webp|txt|xml|webmanifest)$/.test(pathname)) return pathname;
  return pathname === "/" ? "/vibesafe" : `/vibesafe${pathname}`;
}
