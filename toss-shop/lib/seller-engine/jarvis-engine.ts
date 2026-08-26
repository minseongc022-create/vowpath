/**
 * Jarvis — Effiroad 토스쇼핑 AI (에피로드 내 AI 이름)
 *
 * 93% 신뢰도는 "가짜 숫자"가 아니라 **게이트 통과 + 실데이터 + 상위셀러 전술 정렬**로만 부여.
 * 데모/미연동 시 93% 미만 캡 · 연동 완료 + 모든 hard gate + top-seller 정렬 시에만 93+.
 */

import type {
  IntegrationStatus,
  JarvisConfidenceReport,
  JarvisGateResult,
} from "../types";
import {
  isSupplierViableForSourcing,
  meetsSupplierPolicy,
  supplierPolicyDetail,
  type SupplierQuality,
} from "../wholesale/supplier-quality";

export const JARVIS_NAME = "Jarvis";
export const JARVIS_VERSION = "1.2";
export const JARVIS_CONFIDENCE_THRESHOLD = 93;
export const JARVIS_MONTHLY_GOAL_KRW = 10_000_000;

/** 대박(잭팟) 소싱 최소 신뢰도 */
export const JARVIS_JACKPOT_THRESHOLD = 93;

/** 미인증 시 confidence 상한 (threshold - 1) */
export const JARVIS_UNCERTIFIED_CAP = 92;

export type { IntegrationStatus, JarvisConfidenceReport, JarvisGateResult };

export function assessIntegration(input: {
  tossApiConfigured: boolean;
  wholesaleApiConfigured: boolean;
  dataQuality: "live" | "mixed" | "demo";
  catalogSize: number;
}): IntegrationStatus {
  const missing: string[] = [];
  let score = 0;

  if (input.tossApiConfigured) score += 40;
  else missing.push("토스쇼핑 FEP API (입점 후 키 등록)");

  if (input.wholesaleApiConfigured) score += 30;
  else missing.push("도매매 Open API (DOMEGGOOK_API_KEY — supply/도매매)");

  if (input.dataQuality === "live") score += 30;
  else if (input.dataQuality === "mixed") {
    score += 15;
    missing.push("토스 실시간 카탈로그·주문 동기화");
  } else {
    missing.push("실데이터 (현재 데모 카탈로그)");
  }

  return {
    score,
    tossApi: input.tossApiConfigured,
    wholesaleApi: input.wholesaleApiConfigured,
    liveCatalog: input.dataQuality === "live",
    domemePreferred: true,
    readyFor90: score >= 90,
    missing,
  };
}

export function computeJarvisConfidence(input: {
  integration: IntegrationStatus;
  v6MasterScore: number;
  safetyScore: number;
  marginPct: number;
  monthlyProfitKrw: number;
  moq: number;
  wholesaleLive: boolean;
  wholesalePlatform?: "domeggook" | "domeme";
  criticalRisks: number;
  blockRisks: number;
  representativeItemScore?: number;
  isolationScore?: number;
  catalogStrategyMode?: "win_representative" | "avoid_catalog";
  competitionIntensity: number;
  searchVolume: number;
  topSellerAlignment?: number;
  /** 공급사 등급·출고속도 — 1등급+당일발송만 통과 (미확인이면 탈락) */
  supplierQuality?: SupplierQuality;
  /** live 위탁 소싱이 아닌 경우(데모/수입) 공급처 게이트를 적용하지 않음 */
  supplierPolicyApplies?: boolean;
}): JarvisConfidenceReport {
  const gates: JarvisGateResult[] = [];
  const topSeller = input.topSellerAlignment ?? 0;

  gates.push({
    id: "integration",
    label: "연동 준비",
    passed: input.integration.readyFor90,
    weight: 20,
    detail: input.integration.readyFor90
      ? `연동 ${input.integration.score}% — 실데이터 기반`
      : `연동 ${input.integration.score}% — ${input.integration.missing[0] ?? "설정 필요"}`,
  });

  gates.push({
    id: "domeme_moq",
    label: "도매매 단품(MOQ≤1)",
    passed: input.moq <= 1 && (input.wholesalePlatform === "domeme" || !input.wholesaleLive),
    weight: 10,
    detail:
      input.moq <= 1
        ? input.wholesalePlatform === "domeme"
          ? "도매매 단품 공급"
          : "MOQ 1 — 위탁 가능"
        : `MOQ ${input.moq} — 도매매 단품 공급처 재검색 필요`,
  });

  // 1등급·당일발송은 "오늘출발을 약속해도 되는가"의 근거이지 "팔아도
  // 되는가"의 근거가 아니다. 도매꾹 API가 등급 필드를 안 주는 공급처가
  // 대부분이라, 이걸 하드 게이트로 두면 마진·반품정책이 멀쩡한 상품도
  // 등급 미확인 하나로 통째로 막힌다. 그래서 여기서는 **가중치**로만 반영해
  // 최상급 공급처를 우대하되, 통과 못 해도 인증 자체를 막지는 않는다.
  const supplierPolicyApplies = input.supplierPolicyApplies ?? input.wholesaleLive;
  gates.push({
    id: "supplier_grade",
    label: "공급처 1등급·당일발송 (가점)",
    passed: supplierPolicyApplies ? meetsSupplierPolicy(input.supplierQuality) : true,
    weight: 12,
    detail: supplierPolicyApplies
      ? supplierPolicyDetail(input.supplierQuality)
      : "데모/미연동 — 실공급처 확정 후 재판정",
  });

  // 대신 소싱을 막는 실질적 안전장치는 이것이다 — **실측으로 확인된 나쁨**만
  // 걸러낸다(출고율 70% 미만, 배송 지연 확정). 미확인·일반등급은 통과한다.
  gates.push({
    id: "supplier_safe",
    label: "공급처 위험 신호 없음",
    passed: supplierPolicyApplies ? isSupplierViableForSourcing(input.supplierQuality) : true,
    weight: 8,
    detail: input.supplierQuality?.verified
      ? input.supplierQuality.reason
      : "등급 미확인 — 위험 신호 없어 소싱 유지",
  });

  gates.push({
    id: "margin",
    label: "순마진",
    passed: input.marginPct >= 15,
    weight: 12,
    detail: `마진 ${input.marginPct}% ${input.marginPct >= 15 ? "✓" : "(15% 미만)"}`,
  });

  gates.push({
    id: "master",
    label: "Jarvis 종합점수",
    passed: input.v6MasterScore >= 80,
    weight: 14,
    detail: `v6 ${input.v6MasterScore}/99`,
  });

  gates.push({
    id: "safety",
    label: "정책·페널티 안전",
    passed: input.safetyScore >= 85 && input.criticalRisks === 0 && input.blockRisks === 0,
    weight: 12,
    detail:
      input.criticalRisks + input.blockRisks > 0
        ? `차단 리스크 ${input.criticalRisks + input.blockRisks}건`
        : `안전 ${input.safetyScore}`,
  });

  const catalogOk =
    input.catalogStrategyMode === "avoid_catalog"
      ? (input.isolationScore ?? 0) >= 55
      : (input.representativeItemScore ?? 0) >= 58;
  gates.push({
    id: "catalog",
    label: "카탈로그 전략",
    passed: catalogOk,
    weight: 10,
    detail:
      input.catalogStrategyMode === "avoid_catalog"
        ? `회피 isolation ${input.isolationScore ?? 0}`
        : `대표아이템 ${input.representativeItemScore ?? 0}`,
  });

  gates.push({
    id: "top_seller",
    label: "상위셀러 전술 정렬",
    passed: topSeller >= 78,
    weight: 12,
    detail: `검증 전술 정렬 ${topSeller}% ${topSeller >= 78 ? "✓" : "(78% 미만)"}`,
  });

  gates.push({
    id: "profit",
    label: "월 기여 수익",
    passed: input.monthlyProfitKrw >= 500_000,
    weight: 10,
    detail: `월 ${Math.round(input.monthlyProfitKrw / 10_000) / 100}M`,
  });

  gates.push({
    id: "market",
    label: "수요·경쟁",
    passed: input.searchVolume >= 3000 && input.competitionIntensity < 2.2,
    weight: 10,
    detail: `검색 ${input.searchVolume.toLocaleString()} · 경쟁 ${input.competitionIntensity.toFixed(1)}`,
  });

  let confidencePct = 0;
  for (const g of gates) {
    if (g.passed) confidencePct += g.weight;
    else confidencePct += g.weight * 0.32;
  }

  if (!input.integration.readyFor90) {
    confidencePct = Math.min(confidencePct, JARVIS_UNCERTIFIED_CAP);
  }

  if (input.criticalRisks > 0 || input.blockRisks > 0) {
    confidencePct = Math.min(confidencePct, 74);
  }

  if (!input.wholesaleLive && input.integration.wholesaleApi) {
    confidencePct = Math.min(confidencePct, 84);
  }

  confidencePct = Math.min(99, Math.max(0, Math.round(confidencePct)));

  const allHardGates =
    gates
      .filter((g) =>
        // supplier_grade(1등급·당일발송)는 뺐다 — 도매꾹 API가 등급 필드를
        // 안 주는 공급처가 대부분이라 하드 게이트로 두면 마진·안전이 멀쩡한
        // 상품도 등급 미확인 하나로 인증 자체가 막혔다. 대신 supplier_safe
        // (실측으로 확인된 위험만 차단)를 하드 게이트로 둔다 — "가짜 93%"를
        // 막는 목적은 유지하되, 모르는 것과 위험한 것을 구분한다.
        ["integration", "margin", "safety", "domeme_moq", "top_seller", "supplier_safe"].includes(
          g.id,
        ),
      )
      .every((g) => g.passed) &&
    input.criticalRisks === 0 &&
    input.blockRisks === 0;

  const certified =
    confidencePct >= JARVIS_CONFIDENCE_THRESHOLD &&
    allHardGates &&
    input.integration.readyFor90;

  if (!certified) {
    confidencePct = Math.min(confidencePct, JARVIS_UNCERTIFIED_CAP);
  }

  let jackpotPct = confidencePct;
  if (input.monthlyProfitKrw >= 900_000 && input.marginPct >= 18 && catalogOk && topSeller >= 85) {
    jackpotPct = Math.min(99, confidencePct + 4);
  }
  if (input.competitionIntensity < 1.2 && input.searchVolume >= 8000) {
    jackpotPct = Math.min(99, jackpotPct + 2);
  }
  jackpotPct = Math.round(jackpotPct);

  const jackpotCertified = jackpotPct >= JARVIS_JACKPOT_THRESHOLD && certified;

  const failed = gates.filter((g) => !g.passed).map((g) => g.label);
  const brief = certified
    ? `Jarvis 인증 ${confidencePct}% — 상위셀러 전술 ${topSeller}% · 월 1,000만 원 경로 SKU`
    : confidencePct >= 88
      ? `Jarvis ${confidencePct}% — ${failed.length ? failed.slice(0, 2).join(", ") + " 보완 시 93%+" : "게이트 보완 중"}`
      : `Jarvis ${confidencePct}% — ${failed.slice(0, 3).join(" → ") || "검토 중"}`;

  const monthlyPathNote = certified
    ? `대박 ${jackpotPct}% · 목표 ${Math.round((input.monthlyProfitKrw / JARVIS_MONTHLY_GOAL_KRW) * 1000) / 10}%`
    : `93% 인증까지: ${failed.slice(0, 2).join(" → ")}`;

  return {
    jarvisVersion: JARVIS_VERSION,
    confidencePct,
    jackpotPct,
    certified,
    jackpotCertified,
    integration: input.integration,
    gates,
    brief,
    monthlyPathNote,
    topSellerAlignment: topSeller,
  };
}

export function filterJarvisCertifiedPicks<T extends { jarvis?: JarvisConfidenceReport }>(
  picks: T[],
  opts?: { minConfidence?: number; onlyCertified?: boolean },
): T[] {
  const min = opts?.minConfidence ?? JARVIS_CONFIDENCE_THRESHOLD;
  const filtered = picks.filter((p) => {
    const c = p.jarvis?.confidencePct ?? 0;
    if (opts?.onlyCertified) return p.jarvis?.certified === true;
    return c >= min;
  });

  // ⚠️ 예전엔 여기서 아무것도 통과 못 하면 상위 3개를 그냥 돌려줬다.
  //
  // 그 조용한 폴백이 시스템 전체를 거짓말하게 만들었다:
  //  · 파이프라인 집계가 "인증 2건"이라고 보고했지만 실제 인증은 0건이었다.
  //  · 자율주행이 그 미인증 후보로 초안을 만들었고, 등록 단계는 진짜 인증
  //    여부를 다시 보므로 그 초안들은 영원히 못 올라갔다 — 초안만 쌓이고
  //    등록은 0인 상태가 이렇게 만들어졌다.
  //  · onlyCertified로 부르는 쪽은 `.length >= 2`로 판단하는데, 인증 0건일
  //    때도 3이 돌아와 조건이 항상 참이 됐다.
  //
  // 통과한 게 없으면 없다고 해야 원인을 고칠 수 있다. 빈 배열이 정답이다.
  return filtered;
}

export function buildJarvisMonthlyBrief(input: {
  picks: { jarvis?: JarvisConfidenceReport; monthlyProfitKrw: number }[];
  integration: IntegrationStatus;
}): string {
  const certified = input.picks.filter((p) => p.jarvis?.certified);
  const projected = certified.reduce((s, p) => s + p.monthlyProfitKrw, 0);
  const goal = JARVIS_MONTHLY_GOAL_KRW;

  if (!input.integration.readyFor90) {
    return `Jarvis: 연동 ${input.integration.score}% — ${input.integration.missing.join(", ")} 완료 후 93%+ 인증 SKU만 월 1,000만 원 경로에 사용합니다.`;
  }
  if (certified.length === 0) {
    return `Jarvis: 연동 완료 — 93% 인증 SKU 0개. 상위셀러 전술·게이트 통과 SKU만 노출합니다.`;
  }
  const pct = Math.min(100, Math.round((projected / goal) * 1000) / 10);
  return `Jarvis: **93% 인증 SKU ${certified.length}개** · 합산 월 ${projected.toLocaleString()}원 (${pct}%). 인증 SKU 80% 집중 시 월 1,000만 원 **경로 ${pct >= 100 ? "달성" : pct >= 70 ? "유효" : "구축 중"}**.`;
}
