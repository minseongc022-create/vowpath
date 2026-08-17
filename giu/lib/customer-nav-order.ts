import { toGiuInternalPath } from "./routes";

/** Left-to-right tab order + depth for directional page transitions. */
export function getCustomerNavOrder(pathname: string): number {
  const p = toGiuInternalPath(pathname);
  if (p === "/giu/hop" || p === "/giu/hop/") return 0;
  if (p.startsWith("/giu/hop/")) return 0.5;
  if (p === "/giu/yeu-thich" || p.startsWith("/giu/yeu-thich/")) return 1;
  if (p.startsWith("/giu/ga/")) return 1.5;
  if (p === "/giu/ma-cua-toi" || p.startsWith("/giu/ma-cua-toi/")) return 2;
  if (p.startsWith("/giu/dat/")) return 2.5;
  return 0;
}

export const CUSTOMER_TAB_ORDERS = [0, 1, 2] as const;
