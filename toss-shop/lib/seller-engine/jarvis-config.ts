/**
 * Jarvis runtime limits — env-driven autopilot throughput
 */

export function getAutopilotMaxDraftsPerCycle(): number {
  const raw = process.env.JARVIS_AUTOPILOT_MAX_DRAFTS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 3;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 10);
}

export function getAutoExecuteMaxPerCycle(): number {
  const raw = process.env.JARVIS_AUTO_EXECUTE_MAX?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 5);
}

/** Health check id → Vercel env fix hint */
export const JARVIS_ENV_FIX_HINTS: Record<string, string> = {
  detail_external: "OPENAI_API_KEY 또는 DRAPH/HOOKABLE API → Vercel Production",
  matchcut: "OPENAI_API_KEY → Vercel Production",
  toss_publish: "TOSS_SHOPPING_ACCESS_KEY + TOSS_SHOPPING_SECRET_KEY (토스 셀러센터 발급)",
  category_auto_match: "OPENAI_API_KEY → 상품마다 실제 토스 카테고리 트리를 실시간 탐색해 리프 카테고리 자동 선택",
  category_id:
    "(자동 매칭 실패 시 폴백) TOSS_SHOP_DEFAULT_CATEGORY_ID(기본 1개) 또는 TOSS_SHOP_CATEGORY_ID_MAP(카테고리별 JSON, 예 {\"food\":123,\"beauty\":456})",
  return_location:
    "TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID(기본) + TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP(공급처별 JSON, 예 {\"domeggook:12345\":678})",
  wholesale_search: "DOMEGGOOK_API_KEY → Vercel Production",
  order_sync: "TOSS_SHOPPING_ACCESS_KEY + TOSS_SHOPPING_SECRET_KEY (설정 → API 연동)",
  tracking_register: "토스 FEP API + 주문 sync",
  autopilot: "JARVIS_AUTOPILOT_ENABLED=true (vercel.json 기본 ON)",
  auto_execute: "JARVIS_AUTO_EXECUTE=true (선택, OK 생략 자동 등록)",
  ai_image_studio: "OPENAI_API_KEY → Vercel Production (배경 재구성·셀링포인트 배지 자동 생성)",
  supplier_grade_gate: "DOMEGGOOK_API_KEY → 공급처 1등급·당일발송 실데이터 판정 (미연동 시 fail-closed로 전부 탈락)",
  winner_sku: "토스 주문·정산 동기화 (설정 → API 연동) — 효자상품은 예측이 아닌 실제 입금액으로만 판정한다",
  wholesale_adapters:
    "도매처별 API 키 (OWNERCLAN_API_KEY / ONCH_API_KEY / ZENTRADE_API_KEY 등) + 실응답 1건으로 등급·출고 필드명 확정 필요",
  channel_mode: "TOSS_SHOP_IMPORT_SALES_ENABLED=true (수입판매 재활성 — 랜딩코스트 실측·수입인증 게이트 선행 필요)",
  fee_incentive_wired: "설정 불필요 — 공급처가 1등급·당일발송으로 검증되면 자동으로 판매수수료 0% 마진 적용",
  same_day_gate: "DOMEGGOOK_API_KEY → 공급처 정상출고율 판독 (미확인이면 오늘출발 약속 불가로 탈락)",
};

export function envFixHintForCheck(checkId: string): string | undefined {
  return JARVIS_ENV_FIX_HINTS[checkId];
}
