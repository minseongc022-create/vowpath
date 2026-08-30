/**
 * 자비스 화면 주소
 *
 * ★ 실제로 쓰는 화면만 둔다
 *
 * 옛 대시보드는 메뉴가 11개였는데 사장님이 실제로 쓰는 건 셋뿐이었다 —
 * 대화, 검수, 연동 설정. 나머지는 화면을 채울 뿐 결정을 돕지 않았다.
 *
 * ⚠️ 주소를 하드코딩하지 않는다. effiroad.com은 자비스를 루트에 서비스하고
 * 다른 호스트는 `/sellerpulse` 밑에 둔다. 하드코딩하면 운영에서 리다이렉트를
 * 한 번 더 타고, 호스트 설정이 바뀌면 조용히 깨진다.
 */

import { sellerPulseAtRoot } from "@/lib/seller-pulse-host";

export const JV_BASE = sellerPulseAtRoot() ? "" : "/sellerpulse";

function jv(path: string): string {
  return JV_BASE ? `${JV_BASE}${path}` : path || "/";
}

export const JV_ROUTES = {
  /** 자비스와 대화 — 여기가 홈이다 */
  chat: jv("/"),
  /** 올리기 전 검수 */
  review: jv("/review"),
  /** 반품 처리 */
  returns: jv("/returns"),
  /** 연동 설정 */
  settings: jv("/settings"),
  login: jv("/login"),
} as const;

export const JV_API = {
  chat: "/api/jarvis/chat",
  drafts: "/api/jarvis/drafts",
  returns: "/api/jarvis/returns",
  settings: "/api/jarvis/settings",
  cron: "/api/jarvis/cron",
  /** 쉐어링크 자동화 — 검수 대기 조회, 설정, 승인/반려, 수동 소싱 */
  sharelink: "/api/jarvis/sharelink",
} as const;
