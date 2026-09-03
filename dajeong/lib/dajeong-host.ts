import { normalizeHostname } from "@/lib/canonical-host";

/** Dedicated 하루위드(haruwith.com) domain — same app as effiroad.com/dajeong, different host. */
export const DAJEONG_HOSTS = new Set(["haruwith.com", "www.haruwith.com"]);

export function isDajeongHost(host: string | null | undefined): boolean {
  return DAJEONG_HOSTS.has(normalizeHostname(host));
}

/** Map the dedicated domain's paths onto internal /dajeong/* and /api/dajeong/* routes. */
export function dajeongInternalPath(pathname: string): string {
  if (pathname.startsWith("/dajeong")) return pathname;
  if (pathname.startsWith("/api/dajeong") || pathname.startsWith("/api/cron/dajeong-notifications")) return pathname;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/dajeong-sw.js") return pathname;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|webmanifest)$/)) return pathname;
  return pathname === "/" ? "/dajeong" : `/dajeong${pathname}`;
}
