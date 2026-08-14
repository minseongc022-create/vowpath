import { getGiuPublicOrigin } from "@/giu/lib/giu-host";

/** Absolute public URL for Zalo / share links. */
export function giuPublicUrl(path = ""): string {
  const origin = getGiuPublicOrigin();
  if (!path || path === "/") return origin;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/giu/")) {
    return `${origin}${normalized.slice(4)}`;
  }
  if (normalized === "/giu") return origin;
  return `${origin}${normalized}`;
}

export const GIU_SALES_URLS = {
  home: () => giuPublicUrl("/"),
  boxes: () => giuPublicUrl("/hop"),
  merchantSignup: () => giuPublicUrl("/cua-hang"),
  merchantPanel: () => giuPublicUrl("/cua-hang/panel"),
  merchantFlyer: () => giuPublicUrl("/tai-quan"),
  salesKit: () => giuPublicUrl("/ban-hang"),
} as const;
