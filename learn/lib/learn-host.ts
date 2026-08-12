import { normalizeHostname } from "@/lib/canonical-host";

/** Dedicated Lane Learn subdomain — separate from effiroad.com dispatch marketing. */
export const LEARN_HOSTS = new Set(["learn.effiroad.com", "lane.effiroad.com"]);

export function isLearnHost(host: string | null | undefined): boolean {
  return LEARN_HOSTS.has(normalizeHostname(host));
}

/** Map learn subdomain paths to internal /learn/* routes. */
export function learnInternalPath(pathname: string): string | null {
  if (pathname.startsWith("/learn")) return pathname;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return pathname;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp)$/)) return pathname;
  return pathname === "/" ? "/learn" : `/learn${pathname}`;
}
