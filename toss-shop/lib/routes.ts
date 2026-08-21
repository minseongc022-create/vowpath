import { sellerPulseAtRoot } from "@/lib/seller-pulse-host";

/** Public URL base — empty on effiroad.com root, /sellerpulse elsewhere. */
export const SP_BASE = sellerPulseAtRoot() ? "" : "/sellerpulse";

function sp(path: string): string {
  return SP_BASE ? `${SP_BASE}${path}` : path || "/";
}

/** 셀러펄스 (Seller Pulse) public routes */
export const SP_ROUTES = {
  home: sp(""),
  login: sp("/login"),
  dashboard: sp("/dashboard"),
  rankings: sp("/dashboard/rankings"),
  keywords: sp("/dashboard/keywords"),
  competitors: sp("/dashboard/competitors"),
  settlements: sp("/dashboard/settlements"),
  settings: sp("/dashboard/settings"),
} as const;
