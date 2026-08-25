/**
 * 반품지 프로비저닝 큐 — 사람 손이 꼭 필요한 최소치만 추려낸다
 *
 * ★ 문제
 *
 * 토스는 반품지를 API로 만들어주지 않는다(공식 FAQ 기준). 그래서 "공급처가 직접
 * 수거하는데 그 주소가 토스에 없다"는 상황은 원리적으로 사람이 한 번은 손대야 한다.
 *
 * ★ 그런데 그게 "매일 손대야 한다"가 되면 안 된다
 *
 * 도매꾹/도매매는 상품마다 공급사가 다르다. 막힌 공급처를 전부 등록해달라고
 * 늘어놓으면 하루 수십 건이 되고, 자동화가 아니게 된다.
 *
 * 그래서 이 모듈은 **막힌 걸 전부 떠넘기지 않는다**. 자비스는 등록 없이 지금 팔 수
 * 있는 후보로 매일의 등록 목표를 채우고, 반품지 등록 요청은 **반복해서 나타나고
 * 실제로 돈이 되는 공급처**만 추려서 올린다. 한 번 등록되면 주소 매칭으로 자동
 * 연결되므로 그 공급처는 영구히 자동화된다 — 즉 손대는 횟수가 시간이 갈수록 준다.
 *
 * 이게 사람이 하는 판단이다: 50곳을 다 뚫는 게 아니라, 뚫을 가치가 있는 3곳을 뚫는다.
 */

import type { ProvisioningRequest } from "./return-logistics-brain";

export const PROVISIONER_VERSION = "1.0";

/** 한 번에 사장님께 올리는 최대 건수 — 이보다 많으면 실행되지 않는다 */
const DEFAULT_MAX_ASKS = 3;

/** 이 정도는 벌어야 등록 수고를 요청할 만하다 (월 기여 기준) */
const MIN_MONTHLY_VALUE_KRW = 150_000;

export type ProvisioningCandidate = {
  key: string;
  request: ProvisioningRequest;
  /** 이 공급처 때문에 막힌 상품 수 — 반복될수록 뚫을 가치가 크다 */
  blockedCount: number;
  /** 막힌 상품들의 월 기여 합계(원) — 실제로 돈이 되는지 */
  monthlyValueKrw: number;
  /** 사람이 읽는 우선순위 근거 */
  rationale: string;
};

export type ProvisioningPlan = {
  engineVersion: string;
  /** 지금 등록을 요청할 공급처 — 짧게 유지한다 */
  asks: ProvisioningCandidate[];
  /** 막혔지만 아직 요청할 만큼은 아닌 공급처 수 */
  deferred: number;
  /** 이번에 막힌 상품 총 수 */
  totalBlocked: number;
  /** 사람이 읽는 한 줄 요약 */
  summary: string;
};

export type ProvisioningInput = {
  /** 반품 물류 두뇌가 needs_provisioning으로 판정한 건들 */
  blocked: Array<{
    request: ProvisioningRequest;
    /** 이 상품의 월 기여 추정(원) — 없으면 0으로 본다 */
    monthlyValueKrw?: number;
  }>;
  maxAsks?: number;
  /** 이미 등록 요청을 올린 공급처 키 — 같은 걸 반복해서 올리지 않는다 */
  alreadyAsked?: string[];
};

function keyOf(r: ProvisioningRequest): string {
  return `${r.supplierPlatform}:${r.supplierId}`.toLowerCase();
}

/**
 * 막힌 공급처들을 모아 **요청할 가치가 있는 것만** 추린다.
 *
 * 정렬 기준은 "돈"이 먼저다. 같은 값이면 반복 횟수가 많은 쪽 —
 * 자주 나온다는 건 앞으로도 계속 막힌다는 뜻이라 한 번 뚫으면 오래 간다.
 */
export function planReturnLocationProvisioning(input: ProvisioningInput): ProvisioningPlan {
  const maxAsks = input.maxAsks ?? DEFAULT_MAX_ASKS;
  const asked = new Set((input.alreadyAsked ?? []).map((k) => k.toLowerCase()));

  const byKey = new Map<string, ProvisioningCandidate>();
  for (const item of input.blocked) {
    const key = keyOf(item.request);
    const existing = byKey.get(key);
    if (existing) {
      existing.blockedCount += 1;
      existing.monthlyValueKrw += item.monthlyValueKrw ?? 0;
      continue;
    }
    byKey.set(key, {
      key,
      request: item.request,
      blockedCount: 1,
      monthlyValueKrw: item.monthlyValueKrw ?? 0,
      rationale: "",
    });
  }

  const all = [...byKey.values()];
  const eligible = all
    .filter((c) => !asked.has(c.key))
    // 돈이 되거나, 반복해서 걸리는 곳만. 한 번 스친 저가 공급처는 올리지 않는다.
    .filter((c) => c.monthlyValueKrw >= MIN_MONTHLY_VALUE_KRW || c.blockedCount >= 3)
    .sort((a, b) => b.monthlyValueKrw - a.monthlyValueKrw || b.blockedCount - a.blockedCount);

  const asks = eligible.slice(0, maxAsks).map((c) => ({
    ...c,
    rationale:
      `상품 ${c.blockedCount}건이 이 공급처 때문에 막혀 있습니다` +
      (c.monthlyValueKrw > 0 ? ` (월 기여 약 ${c.monthlyValueKrw.toLocaleString()}원)` : "") +
      ". 한 번 등록하면 이후 이 공급처 상품은 전부 자동으로 연결됩니다.",
  }));

  const totalBlocked = input.blocked.length;
  const deferred = all.length - asks.length;

  return {
    engineVersion: PROVISIONER_VERSION,
    asks,
    deferred,
    totalBlocked,
    summary: asks.length
      ? `반품지 ${asks.length}곳만 등록하면 막힌 상품 ${asks.reduce((s, a) => s + a.blockedCount, 0)}건이 풀립니다` +
        (deferred > 0 ? ` (나머지 ${deferred}곳은 아직 등록할 가치가 낮아 보류)` : "")
      : totalBlocked > 0
        ? `반품지 미등록으로 ${totalBlocked}건을 건너뛰었지만, 등록을 요청할 만큼 값어치 있는 공급처는 없습니다 — 등록 없이 팔 수 있는 후보로 채웁니다`
        : "반품지 때문에 막힌 상품 없음 — 전량 자동 처리",
  };
}

/**
 * 사장님이 토스 셀러센터에 그대로 옮겨 적을 수 있는 지시서.
 *
 * 이름 규칙(`자비스-플랫폼-공급사ID`)을 반드시 그대로 쓰게 안내한다 —
 * 그 이름이 있어야 주소 판독이 실패해도 자비스가 이름만으로 자동 연결한다.
 */
export function renderProvisioningInstructions(plan: ProvisioningPlan): string {
  if (!plan.asks.length) return plan.summary;

  const lines = [
    "토스 셀러센터 → 판매자정보 → 배송/교환/반품 정보 → 교환·반품지에서 아래를 등록하세요.",
    "이름을 규칙대로 써야 자비스가 자동으로 물어갑니다.",
    "",
  ];
  for (const [i, ask] of plan.asks.entries()) {
    lines.push(
      `${i + 1}. 이름: ${ask.request.suggestedName}`,
      `   주소: ${ask.request.address}`,
      `   이유: ${ask.rationale}`,
      "",
    );
  }
  lines.push("등록 후에는 아무것도 하지 않아도 됩니다 — 자비스가 다음 사이클에 자동 연결합니다.");
  return lines.join("\n");
}
