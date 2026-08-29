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
  /**
   * 등록 전 최종 검수.
   *
   * ⚠️ 이제 자비스 화면(`/review`)을 가리킨다. 옛 경로(`/dashboard/review`)는
   * 은퇴해 홈으로 리다이렉트되므로, 여기를 안 바꾸면 문자로 나가는 링크가
   * 리다이렉트를 한 번 더 타고 검수 화면이 아닌 홈에 떨어진다.
   */
  review: sp("/review"),
  settings: sp("/dashboard/settings"),
} as const;
