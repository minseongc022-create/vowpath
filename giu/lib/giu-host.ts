import { normalizeHostname } from "@/lib/canonical-host";

/** Primary Giu marketing host (no www). Override via NEXT_PUBLIC_GIU_HOST. */
export const GIU_PRIMARY_HOST = (
  process.env.NEXT_PUBLIC_GIU_HOST?.trim() || "giucuu.com"
)
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .replace(/^www\./, "");

export const GIU_HOSTS = new Set([GIU_PRIMARY_HOST, `www.${GIU_PRIMARY_HOST}`]);

export function isGiuHost(host: string | null | undefined): boolean {
  return GIU_HOSTS.has(normalizeHostname(host));
}

/** Public HTTPS origin for Giu (Zalo links, OG tags). */
export function getGiuPublicOrigin(): string {
  const fromUrl = process.env.NEXT_PUBLIC_GIU_URL?.trim();
  if (fromUrl && !fromUrl.includes("localhost")) {
    return fromUrl.replace(/\/$/, "");
  }
  return `https://${GIU_PRIMARY_HOST}`;
}

/** Strip /giu prefix on custom domain so URLs stay clean (giucuu.com/hop). */
export function giuPublicRedirectPath(pathname: string): string | null {
  if (pathname === "/giu") return "/";
  if (pathname.startsWith("/giu/")) return pathname.slice(4) || "/";
  return null;
}

/** Map custom-domain paths to internal /giu/* app routes. */
export function giuInternalPath(pathname: string): string | null {
  if (pathname.startsWith("/giu")) return pathname;
  if (pathname.startsWith("/api/giu")) return pathname;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return pathname;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|txt|xml|json|webmanifest)$/)) {
    return pathname;
  }
  if (pathname.startsWith("/api/")) return null;
  return pathname === "/" ? "/giu" : `/giu${pathname}`;
}
