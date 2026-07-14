/** Primary marketing hostname (no www). */
export const CANONICAL_MARKETING_HOST = "effiroad.com";

/** Hosts that should 301/308 to https://effiroad.com (legacy brand + www duplicate). */
export const MARKETING_HOST_ALIASES = new Set([
  "www.effiroad.com",
  "vowroad.com",
  "www.vowroad.com",
]);

export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  return host.toLowerCase().split(":")[0];
}

export function isMarketingHostAlias(host: string | null | undefined): boolean {
  const h = normalizeHostname(host);
  return MARKETING_HOST_ALIASES.has(h);
}

export function canonicalMarketingUrl(pathname: string, search = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${CANONICAL_MARKETING_HOST}${path}${search}`;
}
