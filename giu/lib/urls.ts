import { getGiuPublicOrigin } from "@/giu/lib/giu-host";

/** Absolute public URL for Zalo / share links. */
export function giuPublicUrl(path = "", origin?: string): string {
  const base = (origin ?? getGiuPublicOrigin()).replace(/\/$/, "");
  if (!path || path === "/") return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/giu/")) {
    return `${base}${normalized.slice(4)}`;
  }
  if (normalized === "/giu") return base;
  return `${base}${normalized}`;
}

export function giuSalesUrls(origin: string) {
  return {
    home: () => giuPublicUrl("/", origin),
    boxes: () => giuPublicUrl("/hop", origin),
    merchantSignup: () => giuPublicUrl("/cua-hang", origin),
    merchantPanel: () => giuPublicUrl("/cua-hang/panel", origin),
    merchantFlyer: () => giuPublicUrl("/tai-quan", origin),
    salesKit: () => giuPublicUrl("/ban-hang", origin),
  } as const;
}

export const GIU_SALES_URLS = {
  home: () => giuPublicUrl("/"),
  boxes: () => giuPublicUrl("/hop"),
  merchantSignup: () => giuPublicUrl("/cua-hang"),
  merchantPanel: () => giuPublicUrl("/cua-hang/panel"),
  merchantFlyer: () => giuPublicUrl("/tai-quan"),
  salesKit: () => giuPublicUrl("/ban-hang"),
} as const;
