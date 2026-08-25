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
import type { PendingReturnAddress } from "../types";

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
 * ⚠️ 토스 반품지에는 **이름을 붙일 수 없다** (2026-08 실측: 응답에 이름 필드가
 * 없고 주소·상세주소·우편번호만 있다). 그래서 "이 이름으로 만드세요"라고
 * 안내하지 않는다 — 만들 수 없는 걸 시키는 안내가 되기 때문이다.
 * 연결은 전적으로 **주소 일치**로 이뤄지므로, 주소를 정확히 넣는 것만이 중요하다.
 */
export function renderProvisioningInstructions(plan: ProvisioningPlan): string {
  if (!plan.asks.length) return plan.summary;

  const lines = [
    "토스 셀러센터 → 판매자정보 → 배송/교환/반품 정보 → 교환·반품지에서 아래 주소를 추가하세요.",
    "주소만 정확히 넣으면 됩니다 — 자비스가 주소로 알아서 연결합니다.",
    "",
  ];
  for (const [i, ask] of plan.asks.entries()) {
    lines.push(`${i + 1}. ${ask.request.address}`, `   (${ask.rationale})`, "");
  }
  lines.push("등록 후에는 아무것도 하지 않아도 됩니다 — 자비스가 다음 사이클에 자동 연결합니다.");
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// 일괄 등록용 누적 목록 — "손해를 완전히 0으로 만드는" 유일한 실제 경로
//
// ★ 왜 필요한가
//
// 위 planReturnLocationProvisioning()은 매 사이클 "지금 뚫을 가치가 있는
// 3곳"만 추천한다. 그건 사람을 안 지치게 하려는 설계지만, 사장님이
// "마진 깎이는 것도 싫고 딱 한 번만 몰아서 다 등록하고 싶다"고 하면
// 3곳씩 찔끔 알려주는 게 오히려 느리다.
//
// 그래서 사이클마다 막힌 공급처 주소를 지우지 않고 계속 쌓아둔다
// (MerchantData.pendingReturnAddresses). 사장님이 원하는 때에 이 전체
// 목록을 한 번에 토스 셀러센터에 등록하면, 그 순간부터 그 공급처들은
// 전부 비용 0(공급처 직행)으로 전환된다 — 등록 API가 없는 이상 이게
// "손해 없이 진짜 주소를 그대로 쓰는" 유일한 실제 경로다.
//
// 등록되면(주소가 매칭되면) 해당 공급처는 자동으로 이 목록에서 빠진다.
// ─────────────────────────────────────────────────────────────

export type MergeResult = {
  list: PendingReturnAddress[];
  /** 이번 사이클에 새로 추가된 공급처 수 */
  added: number;
  /** 이번 사이클에 등록 확인돼 목록에서 빠진 공급처 수 */
  resolved: number;
};

/** 목록이 무한정 커지지 않게 — 오래된 것부터 밀어낸다 */
const MAX_PENDING_ADDRESSES = 300;

/**
 * 이번 사이클에 새로 막힌 공급처를 누적 목록에 합치고, 이번 사이클에
 * 매칭에 성공한(더 이상 막히지 않는) 공급처는 목록에서 뺀다.
 */
export function mergePendingReturnAddresses(input: {
  existing: PendingReturnAddress[];
  newlyBlocked: Array<{ request: ProvisioningRequest; monthlyValueKrw?: number }>;
  /** 이번 사이클에 주소가 매칭돼 더 이상 막히지 않는 공급처 키(platform:supplierId) */
  resolvedKeys: string[];
  now: string;
}): MergeResult {
  const resolvedSet = new Set(input.resolvedKeys.map((k) => k.toLowerCase()));
  const byKey = new Map(input.existing.map((e) => [e.key, { ...e }]));

  let added = 0;
  for (const item of input.newlyBlocked) {
    const key = keyOf(item.request);
    if (resolvedSet.has(key)) continue; // 같은 사이클에 막혔다가 바로 풀리는 경우는 없지만 방어적으로
    const prev = byKey.get(key);
    if (prev) {
      prev.blockedCount += 1;
      prev.monthlyValueKrw += item.monthlyValueKrw ?? 0;
      prev.lastSeenAt = input.now;
      prev.address = item.request.address; // 더 최근 판독 주소로 갱신
    } else {
      added++;
      byKey.set(key, {
        key,
        supplierPlatform: item.request.supplierPlatform,
        supplierId: item.request.supplierId,
        supplierNick: item.request.supplierNick,
        address: item.request.address,
        blockedCount: 1,
        monthlyValueKrw: item.monthlyValueKrw ?? 0,
        firstSeenAt: input.now,
        lastSeenAt: input.now,
      });
    }
  }

  let resolved = 0;
  for (const key of resolvedSet) {
    if (byKey.delete(key)) resolved++;
  }

  let list = [...byKey.values()].sort(
    (a, b) => b.monthlyValueKrw - a.monthlyValueKrw || b.blockedCount - a.blockedCount,
  );
  if (list.length > MAX_PENDING_ADDRESSES) {
    // 오래되고 값어치 낮은 것부터 밀어낸다 — 최근 것·비싼 것을 남긴다
    list = list
      .sort((a, b) => (b.lastSeenAt > a.lastSeenAt ? 1 : -1))
      .slice(0, MAX_PENDING_ADDRESSES)
      .sort((a, b) => b.monthlyValueKrw - a.monthlyValueKrw || b.blockedCount - a.blockedCount);
  }

  return { list, added, resolved };
}

/**
 * 누적 목록 전체를 한 번에 등록할 수 있는 지시서로 만든다.
 * 값어치 필터도 3곳 상한도 없다 — "몰아서 한 번에" 끝내기 위한 것이다.
 */
export function renderBulkProvisioningInstructions(list: PendingReturnAddress[]): string {
  if (!list.length) {
    return "지금 등록할 주소가 없습니다 — 모든 공급처가 이미 반품지로 처리되고 있습니다.";
  }
  const lines = [
    `${list.length}곳 — 아래 주소를 토스 셀러센터 → 판매자정보 → 배송/교환/반품 정보 → 교환·반품지에서 한 번에 등록하세요.`,
    "이름은 붙일 수 없습니다 — 주소만 정확히 넣으면 자비스가 자동으로 연결합니다.",
    "",
  ];
  for (const [i, item] of list.entries()) {
    lines.push(
      `${i + 1}. ${item.address}` +
        (item.monthlyValueKrw > 0
          ? ` — 막힌 상품 ${item.blockedCount}건, 월 기여 약 ${item.monthlyValueKrw.toLocaleString()}원`
          : ` — 막힌 상품 ${item.blockedCount}건`),
    );
  }
  lines.push(
    "",
    "전부 등록하면 다음 사이클부터 이 공급처들의 반품 비용이 전부 0원(공급처 직행)으로 바뀝니다.",
  );
  return lines.join("\n");
}
