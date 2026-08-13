import { normalizeHostname } from "@/lib/canonical-host";

/** Dedicated TOPIK VN subdomain — zero Effiroad dispatch overlap. */
export const TOPIK_HOSTS = new Set([
  "topik.effiroad.com",
  "hanpro.vn",
  "www.hanpro.vn",
]);

export function isTopikHost(host: string | null | undefined): boolean {
  return TOPIK_HOSTS.has(normalizeHostname(host));
}

/** Map topik subdomain paths to internal /topik/* routes. */
export function topikInternalPath(pathname: string): string | null {
  if (pathname.startsWith("/topik")) return pathname;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return pathname;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp)$/)) return pathname;
  return pathname === "/" ? "/topik" : `/topik${pathname}`;
}
