import { GIU_HOSTS, GIU_PRIMARY_HOST, giuPublicRedirectPath } from "./giu-host";

export const GIU_ROUTES = {
  auth: "/giu/dang-ky",
  customer: {
    home: "/giu/hop",
    boxes: "/giu/hop",
    favorites: "/giu/yeu-thich",
    my: "/giu/ma-cua-toi",
    box: (id: string) => `/giu/hop/${id}`,
    reservation: (id: string) => `/giu/dat/${id}`,
    merchant: (id: string) => `/giu/ga/${id}`,
  },
  merchant: {
    home: "/giu/cua-hang/panel",
    panel: "/giu/cua-hang/panel",
  },
} as const;

export type GiuAppRole = "customer" | "merchant";

/** Browser/URL path → internal /giu/... path (giucuu.com/hop → /giu/hop). */
export function toGiuInternalPath(pathname: string): string {
  if (!pathname) return "/giu";
  if (pathname.startsWith("/giu")) return pathname;
  if (pathname === "/") return "/giu";
  return `/giu${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

/** Internal /giu/... → public path on giucuu.com (/giu/hop → /hop). */
export function toGiuPublicPath(pathname: string): string {
  return giuPublicRedirectPath(toGiuInternalPath(pathname)) ?? pathname;
}

export function isGiuHostName(host: string | null | undefined): boolean {
  if (!host) return false;
  // x-forwarded-host may be a list: "www.giucuu.com, giucuu.com"
  const h =
    host
      .toLowerCase()
      .split(",")[0]
      ?.trim()
      .split(":")[0]
      ?.replace(/^www\./, "") ?? "";
  return h === GIU_PRIMARY_HOST || GIU_HOSTS.has(h) || GIU_HOSTS.has(`www.${h}`);
}

/**
 * Href/router target for the current product host.
 * On giucuu.com use /hop not /giu/hop (avoids 308 loops + blank RSC).
 */
export function giuHref(internalPath: string, host?: string | null): string {
  const qIndex = internalPath.indexOf("?");
  const pathOnly = qIndex >= 0 ? internalPath.slice(0, qIndex) : internalPath;
  const query = qIndex >= 0 ? internalPath.slice(qIndex) : "";
  const internal = pathOnly.startsWith("/giu") ? pathOnly : toGiuInternalPath(pathOnly);
  const onGiu =
    typeof host === "string"
      ? isGiuHostName(host)
      : typeof window !== "undefined"
        ? isGiuHostName(window.location.hostname)
        : false;
  const out = onGiu ? toGiuPublicPath(internal) : internal;
  return `${out}${query}`;
}

export function isGiuAuthPath(pathname: string): boolean {
  const p = toGiuInternalPath(pathname);
  return (
    p === GIU_ROUTES.auth ||
    p.startsWith(`${GIU_ROUTES.auth}/`) ||
    p === "/giu/auth" ||
    p.startsWith("/giu/auth/") ||
    p === "/giu/dang-nhap" ||
    p === "/giu/dang-ky"
  );
}

export function isGiuMerchantPath(pathname: string): boolean {
  return toGiuInternalPath(pathname).startsWith("/giu/cua-hang");
}

/** Public merchant pitch (/cua-hang) — not the logged-in panel. */
export function isGiuMerchantLandingPath(pathname: string): boolean {
  const p = toGiuInternalPath(pathname);
  return p === "/giu/cua-hang" || p === "/giu/cua-hang/";
}

export function isGiuMerchantAppPath(pathname: string): boolean {
  return isGiuMerchantPath(pathname) && !isGiuMerchantLandingPath(pathname);
}

export function isGiuMapHomePath(pathname: string): boolean {
  const p = toGiuInternalPath(pathname);
  return p === "/giu/hop" || p === "/giu/hop/";
}

export function homePathForRole(role: GiuAppRole, host?: string | null): string {
  const internal = role === "merchant" ? GIU_ROUTES.merchant.home : GIU_ROUTES.customer.home;
  return giuHref(internal, host);
}
