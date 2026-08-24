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
  toss_publish: "TOSS_SHOPPING_* + TOSS_SHOP_DEFAULT_CATEGORY_ID + TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID",
  wholesale_search: "DOMEGGOOK_API_KEY → Vercel Production",
  order_sync: "TOSS_SHOPPING_ACCESS_KEY + TOSS_SHOPPING_SECRET_KEY (설정 → API 연동)",
  tracking_register: "토스 FEP API + 주문 sync",
  autopilot: "JARVIS_AUTOPILOT_ENABLED=true (vercel.json 기본 ON)",
  auto_execute: "JARVIS_AUTO_EXECUTE=true (선택, OK 생략 자동 등록)",
  ai_image_studio: "OPENAI_API_KEY → Vercel Production (배경 재구성·셀링포인트 배지 자동 생성)",
  supplier_grade_gate: "DOMEGGOOK_API_KEY → 공급처 1등급·당일발송 실데이터 판정 (미연동 시 fail-closed로 전부 탈락)",
};

export function envFixHintForCheck(checkId: string): string | undefined {
  return JARVIS_ENV_FIX_HINTS[checkId];
}
