/**
 * 확실성 게이트 — "이 SKU는 사실로 확인된 것인가"
 *
 * ★ 기존 Jarvis 게이트와 무엇이 다른가
 *
 * `jarvis-engine`의 93% 신뢰도는 **점수**다. 여러 지표를 가중합해서 높으면
 * 통과시킨다. 문제는 그 지표 중 상당수가 추정치라는 것이다 — 검색량 추정,
 * 경쟁강도 추정, 일 판매량 추정. 추정치를 잘 조합해도 추정치다. 점수가 높다고
 * 사실이 되지는 않는다.
 *
 * 이 게이트는 점수를 매기지 않는다. **각 근거가 실측인지 추정인지**만 따진다.
 * 그리고 돈이 걸린 판단(등록·광고비 집행)에 필요한 최소한의 실측이 갖춰지지
 * 않으면 통과시키지 않는다. 몇 점이든 상관없다.
 *
 * ★ 왜 이렇게까지 하는가
 * 위탁은 틀려도 재고 손실은 없지만, 공짜는 아니다. 잘못 올린 SKU 하나가
 * 만드는 비용은 이렇다:
 *   · 광고비 — 팔리지 않는 상품에 집행된 돈은 회수되지 않는다
 *   · 페널티 — 품절·발송지연이 쌓이면 배송 인센티브(수수료 0%)가 날아가고,
 *     그건 전 상품의 마진을 8%p 깎는다. 한 SKU의 실수가 전체에 번진다
 *   · 카탈로그 오염 — 경쟁력 없는 상품이 내 스토어 평균 전환율을 떨어뜨린다
 * 그래서 "일단 많이 올리고 보자"는 위탁에서도 손해다. 확실한 것만 올리는 게
 * 결과적으로 더 많이 판다.
 *
 * ★ 판정 기준은 전부 "있다/없다"로 검증 가능한 것만 쓴다
 * 애매한 지표(느낌상 좋아 보임, 트렌드일 것 같음)는 넣지 않았다. 넣는 순간
 * 이 게이트도 추정 점수로 전락한다.
 */

import type { ConsignmentPick } from "../types";
import { meetsSupplierPolicy } from "../wholesale/supplier-quality";
import {
  isReturnPolicyDisqualifying,
  readSupplierReturnPolicy,
} from "../wholesale/supplier-return-policy";

export const CERTAINTY_GATE_VERSION = "1.0";

export type CertaintyEvidence = {
  id: string;
  label: string;
  /** 이 근거가 실측인가 (추정이면 false) */
  factual: boolean;
  /** 통과 여부 */
  passed: boolean;
  /** 없으면 등록 자체를 막는 필수 근거인가 */
  required: boolean;
  detail: string;
};

export type CertaintyVerdict = {
  engineVersion: string;
  /** 등록해도 되는가 — required 근거가 전부 실측으로 통과해야 true */
  certain: boolean;
  /** 실측으로 확인된 근거 수 / 전체 */
  factualCount: number;
  totalCount: number;
  evidence: CertaintyEvidence[];
  /** 통과하지 못한 필수 근거 */
  blockers: string[];
  reason: string;
};

// ─────────────────────────────────────────────────────────────
// 판정에 쓰는 최소 기준
//
// 이 숫자들은 "월 순익 1,000만원"에서 역산한 값이다.
// 목표 1,000만원 / 30일 = 일 333,000원.
// SKU 하나가 일 3건 팔리고 건당 순익 5,000원이면 일 15,000원.
// → 목표에는 약 22개의 "제대로 도는" SKU가 필요하다.
// 그래서 SKU 하나당 최소 기여를 월 30만원(목표의 3%)으로 잡는다.
// 이 밑으로는 22개를 채워도 목표에 닿지 못한다.
// ─────────────────────────────────────────────────────────────

/** SKU 하나가 최소한 만들어야 하는 월 순익 (목표의 3%) */
export const MIN_MONTHLY_PROFIT_KRW = 300_000;
/** 광고·프로모션·반품 여유를 감안한 최소 순마진 */
export const MIN_MARGIN_PCT = 15;
/** 위탁 회전이 가능한 최대 MOQ — 개당 발주가 안 되면 위탁이 아니다 */
export const MAX_MOQ = 1;

export function evaluateCertainty(pick: ConsignmentPick): CertaintyVerdict {
  const evidence: CertaintyEvidence[] = [];
  const w = pick.wholesaleBest;

  // ── 1. 공급처가 실재하는가 (실측) ──────────────────────────
  const supplierLive = w?.source === "live";
  evidence.push({
    id: "supplier_live",
    label: "공급처 실시간 확인",
    factual: supplierLive,
    passed: supplierLive,
    required: true,
    detail: supplierLive
      ? `${w?.platform} 공급처 ${w?.sellerNick ?? w?.sellerId ?? ""} 실시간 조회됨`
      : "공급처가 추정 데이터 — 실제로 살 수 있는지 확인되지 않음",
  });

  // ── 2. 원가가 실측인가 ─────────────────────────────────────
  const costLive = supplierLive && (w?.unitPriceKrw ?? 0) > 0;
  evidence.push({
    id: "cost_live",
    label: "공급가 실측",
    factual: costLive,
    passed: costLive,
    required: true,
    detail: costLive
      ? `공급가 ${w!.unitPriceKrw.toLocaleString()}원 (실시간)`
      : "공급가가 추정치 — 마진 계산의 기반이 사실이 아님",
  });

  // ── 3. 공급처 등급·출고속도 (실측, 인센티브 조건) ──────────
  const supplierOk = meetsSupplierPolicy(w?.supplierQuality);
  evidence.push({
    id: "supplier_grade",
    label: "1등급·당일발송·출고율",
    factual: Boolean(w?.supplierQuality?.verified),
    passed: supplierOk,
    required: true,
    detail: supplierOk
      ? w!.supplierQuality!.reason
      : "공급처 등급·출고율 미확인 또는 기준 미달 — 오늘출발 약속 불가(인센티브 상실 위험)",
  });

  // ── 4. 반품 정책이 소싱 가능한가 ───────────────────────────
  const returnPolicy = readSupplierReturnPolicy(w?.policyText);
  const returnOk = !isReturnPolicyDisqualifying(returnPolicy);
  evidence.push({
    id: "return_policy",
    label: "반품 가능 공급처",
    factual: returnPolicy.verified,
    passed: returnOk,
    required: true,
    detail: returnOk
      ? returnPolicy.reason
      : "반품 불가 공급처 — 청약철회 비용을 셀러가 전액 부담하게 됨",
  });

  // ── 5. MOQ — 위탁이 성립하는가 ─────────────────────────────
  const moq = w?.moq ?? 99;
  const moqOk = moq <= MAX_MOQ;
  evidence.push({
    id: "moq",
    label: `개당 발주 (MOQ ≤ ${MAX_MOQ})`,
    factual: supplierLive,
    passed: moqOk,
    required: true,
    detail: moqOk ? `MOQ ${moq} — 주문 즉시 발주 가능` : `MOQ ${moq} — 재고를 떠안아야 해 위탁이 아님`,
  });

  // ── 6. 마진 (실측 원가 기반일 때만 사실) ───────────────────
  const marginOk = pick.estimatedMarginPct >= MIN_MARGIN_PCT;
  evidence.push({
    id: "margin",
    label: `순마진 ${MIN_MARGIN_PCT}%+`,
    factual: costLive,
    passed: marginOk,
    required: true,
    detail: `순마진 ${pick.estimatedMarginPct}%${costLive ? " (실측 공급가 기준)" : " (추정 공급가 — 신뢰 불가)"}`,
  });

  // ── 7. 목표 기여 — 이 SKU가 의미 있는 크기인가 ─────────────
  const monthly = pick.estimatedMonthlyProfitKrw ?? 0;
  const sizeOk = monthly >= MIN_MONTHLY_PROFIT_KRW;
  evidence.push({
    id: "size",
    label: `월 기여 ${(MIN_MONTHLY_PROFIT_KRW / 10000).toFixed(0)}만원+`,
    // 판매량 예측이 들어가므로 실측이 아니다 — 사실로 표시하지 않는다
    factual: false,
    passed: sizeOk,
    required: true,
    detail: `예상 월 ${monthly.toLocaleString()}원 (예측치 — 등록 후 실판매로 재판정)`,
  });

  // ── 8. 카탈로그 — 최저가 싸움에 갇히지 않는가 ──────────────
  const catalogMode = pick.catalogStrategy?.mode;
  const catalogOk = catalogMode === "avoid_catalog" || (pick.catalogWin?.representativeItemScore ?? 0) >= 58;
  evidence.push({
    id: "catalog",
    label: "카탈로그 진입 가능",
    factual: false,
    passed: catalogOk,
    required: true,
    detail: catalogOk
      ? catalogMode === "avoid_catalog"
        ? "구성 차별화로 단독 카탈로그 — 최저가 경쟁 회피"
        : "대표아이템 경쟁력 확보"
      : "대표아이템도 못 따고 차별화도 안 됨 — 올려도 노출이 막힌다",
  });

  // ── 9. 안전 — 페널티·법적 리스크 ───────────────────────────
  const criticalRisks = pick.riskPlaybook?.criticalCount ?? 0;
  const blockRisks = pick.riskPlaybook?.blockCount ?? 0;
  const safeOk = criticalRisks === 0 && blockRisks === 0;
  evidence.push({
    id: "safety",
    label: "치명 리스크 0",
    factual: true,
    passed: safeOk,
    required: true,
    detail: safeOk
      ? "차단·치명 리스크 없음"
      : `치명 ${criticalRisks}건 · 차단 ${blockRisks}건 — 페널티·법적 문제로 이어짐`,
  });

  const blockers = evidence.filter((e) => e.required && !e.passed).map((e) => e.label);
  const factualCount = evidence.filter((e) => e.factual).length;

  // 필수 근거가 전부 통과해야 확실하다.
  // 추가로, **돈의 기반이 되는 근거(공급처·원가·등급)는 실측이어야 한다** —
  // 이게 추정이면 나머지가 아무리 좋아도 사상누각이다.
  const moneyEvidenceFactual = evidence
    .filter((e) => ["supplier_live", "cost_live", "supplier_grade"].includes(e.id))
    .every((e) => e.factual);

  const certain = blockers.length === 0 && moneyEvidenceFactual;

  return {
    engineVersion: CERTAINTY_GATE_VERSION,
    certain,
    factualCount,
    totalCount: evidence.length,
    evidence,
    blockers,
    reason: certain
      ? `확실 — 필수 ${evidence.length}개 근거 통과, 공급처·원가·등급이 실측으로 확인됨`
      : !moneyEvidenceFactual
        ? "공급처·원가·등급 중 실측이 아닌 항목이 있어 등록 불가 — 추정치로는 돈을 걸 수 없다"
        : `미달 — ${blockers.join(", ")}`,
  };
}

/**
 * 확실한 것만 남긴다.
 *
 * 하루 목표 개수를 채우려고 기준을 낮추지 않는다. 5개를 채우지 못하면
 * 채우지 못한 채로 두고, 그 사실을 보고한다 — 억지로 채운 SKU가
 * 광고비와 페널티로 더 큰 손실을 만들기 때문이다.
 */
export function filterCertainPicks(picks: ConsignmentPick[]): {
  certain: ConsignmentPick[];
  rejected: Array<{ pick: ConsignmentPick; verdict: CertaintyVerdict }>;
} {
  const certain: ConsignmentPick[] = [];
  const rejected: Array<{ pick: ConsignmentPick; verdict: CertaintyVerdict }> = [];

  for (const pick of picks) {
    const verdict = evaluateCertainty(pick);
    if (verdict.certain) certain.push(pick);
    else rejected.push({ pick, verdict });
  }

  // 큰 것부터 — 같은 확실성이면 목표에 더 크게 기여하는 것을 먼저 올린다
  certain.sort((a, b) => (b.estimatedMonthlyProfitKrw ?? 0) - (a.estimatedMonthlyProfitKrw ?? 0));
  return { certain, rejected };
}

/** 목표까지 필요한 SKU 수 — 실제 기여 크기로 역산 */
export function skusNeededForGoal(input: {
  goalKrw: number;
  currentMonthlyKrw: number;
  avgMonthlyPerSkuKrw?: number;
}): number {
  const gap = Math.max(0, input.goalKrw - input.currentMonthlyKrw);
  const per = input.avgMonthlyPerSkuKrw && input.avgMonthlyPerSkuKrw > 0
    ? input.avgMonthlyPerSkuKrw
    : MIN_MONTHLY_PROFIT_KRW;
  return Math.ceil(gap / per);
}
