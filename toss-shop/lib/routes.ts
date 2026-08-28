import { sellerPulseAtRoot } from "@/lib/seller-pulse-host";

/** Public URL base — empty on effiroad.com root, /sellerpulse elsewhere (legacy path). */
export const SP_BASE = sellerPulseAtRoot() ? "" : "/sellerpulse";

function sp(path: string): string {
  return SP_BASE ? `${SP_BASE}${path}` : path || "/";
}

/** Effiroad (에피로드) public routes */
export const SP_ROUTES = {
  home: sp(""),
  login: sp("/login"),
  dashboard: sp("/dashboard"),
  discovery: sp("/dashboard/discovery"),
  rankings: sp("/dashboard/rankings"),
  keywords: sp("/dashboard/keywords"),
  competitors: sp("/dashboard/competitors"),
  settlements: sp("/dashboard/settlements"),
  consignment: sp("/dashboard/consignment"),
  importSales: sp("/dashboard/import"),
  listings: sp("/dashboard/listings"),
  /** 등록 전 최종 검수 — 고객에게 보일 모습 그대로 확인하고 승인하는 곳 */
  review: sp("/dashboard/review"),
  settings: sp("/dashboard/settings"),
} as const;
