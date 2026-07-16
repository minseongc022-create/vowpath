/** Primary marketing hostname (no www). */
export const CANONICAL_MARKETING_HOST = "effiroad.com";

/** Hosts that should 308 to https://effiroad.com (legacy brand + www duplicate). */
export const MARKETING_HOST_ALIASES = new Set([
  "www.effiroad.com",
  "vowroad.com",
  "www.vowroad.com",
]);

/** Retired domains — respond 410 + noindex so Google drops cached SERP entries. */
export const DECOMMISSIONED_HOSTS = new Set(["hvacsvc.link", "www.hvacsvc.link"]);

/** Legacy vowroad subdomains → current effiroad portal/marketing host (hostname only). */
export const LEGACY_PORTAL_HOST_REDIRECTS: Record<string, string> = {
  "link.vowroad.com": "link.effiroad.com",
  "book.vowroad.com": "link.effiroad.com",
  "go.vowroad.com": "go.effiroad.com",
  "portal.vowroad.com": "link.effiroad.com",
  "app.vowroad.com": "link.effiroad.com",
};

export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  return host.toLowerCase().split(":")[0];
}

export function isMarketingHostAlias(host: string | null | undefined): boolean {
  const h = normalizeHostname(host);
  return MARKETING_HOST_ALIASES.has(h);
}

export function isDecommissionedHost(host: string | null | undefined): boolean {
  const h = normalizeHostname(host);
  return DECOMMISSIONED_HOSTS.has(h);
}

export function legacyPortalRedirectHost(host: string | null | undefined): string | null {
  const h = normalizeHostname(host);
  return LEGACY_PORTAL_HOST_REDIRECTS[h] ?? null;
}

/** If this host should redirect, returns full origin (https://host). */
export function resolveCanonicalOrigin(host: string | null | undefined): string | null {
  const h = normalizeHostname(host);
  const portalTarget = LEGACY_PORTAL_HOST_REDIRECTS[h];
  if (portalTarget) return `https://${portalTarget}`;
  if (MARKETING_HOST_ALIASES.has(h)) return `https://${CANONICAL_MARKETING_HOST}`;
  return null;
}

export function canonicalMarketingUrl(pathname: string, search = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${CANONICAL_MARKETING_HOST}${path}${search}`;
}

export function buildCanonicalRedirectUrl(
  host: string | null | undefined,
  pathname: string,
  search = "",
): string | null {
  const origin = resolveCanonicalOrigin(host);
  if (!origin) return null;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}${search}`;
}
