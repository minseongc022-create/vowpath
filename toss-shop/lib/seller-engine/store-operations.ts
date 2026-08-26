/**
 * 상점 운영 두뇌 — 올린 뒤에 벌어지는 일을 자비스가 맡는다
 *
 * ★ 지금까지 없던 것
 *
 * 자비스는 상품을 올리기만 했다. 올린 뒤에 안 팔려도 할 수 있는 게 없었다.
 * 그건 판매 대행이지 운영이 아니다. 실제 셀러가 매일 하는 일은 올리는 게
 * 아니라 **올린 걸 손보는 것**이다 — 안 팔리면 내리고, 팔리면 지키고,
 * 죽은 건 치운다.
 *
 * ★ 판단의 축은 하나다: 마진 바닥
 *
 * 가격을 내리는 건 쉽다. 문제는 어디까지 내리냐다. 원가·수수료·배송비를
 * 빼고 남는 게 없어지는 지점 아래로는 내려선 안 된다. 그 밑은 팔릴수록
 * 손해고, 게다가 반품이 한 건 나면 그 상품 몇 개 판 이익이 통째로 날아간다.
 *
 * 그래서 이 엔진은 **먼저 바닥을 계산하고, 그 위에서만 내린다**. 바닥에
 * 닿았는데도 안 팔리면 더 내리는 게 아니라 **숨긴다** — 그게 정직한 결론이다.
 *
 * ★ 왜 삭제가 아니라 숨김인가
 *
 * 삭제하면 리뷰와 판매 이력이 같이 사라지고 되돌릴 수 없다. 숨겨두면
 * 시장이 바뀌었을 때 다시 꺼낼 수 있다. 되돌릴 수 있는 쪽을 고른다.
 *
 * ★ 토스 추천가 (문서 확인)
 *
 * 토스 문서에 이렇게 적혀 있다 — "최종 판매가가 추천가보다 높으면, 홈
 * 화면에서는 숨겨진 옵션으로 분류돼 노출되지 않아요." 즉 앱 홈의 특가 영역에
 * 뜨느냐 마느냐가 추천가 대비 우리 가격으로 갈린다. 추천가를 API로 읽을 수
 * 있게 되면 이 엔진의 목표가는 그 값이 된다. 지금은 못 읽으므로 **추천가를
 * 추측해서 쓰지 않는다** — 대신 바닥까지의 여유를 단계적으로 쓴다.
 */

export const STORE_OPERATIONS_VERSION = "1.0";

/** 한 번에 이 이상 내리지 않는다 — 크게 흔들면 기존 구매자가 불신한다 */
const MAX_CUT_PCT_PER_STEP = 8;
/** 이만큼 지나도 한 건도 안 팔리면 가격이 문제라고 본다 */
const STALE_DAYS_NO_SALE = 5;
/** 가격을 만진 뒤에는 이만큼 지켜본다 — 매일 흔들면 아무것도 측정 못 한다 */
const COOLDOWN_DAYS = 3;
/** 바닥에 닿은 채 이만큼 더 지나면 숨긴다 */
const GIVE_UP_DAYS_AT_FLOOR = 10;
/** 바닥을 계산할 때 남겨두는 최소 순마진 — 여기가 0이면 팔 이유가 없다 */
const FLOOR_NET_MARGIN = 0.08;

export type ListedSku = {
  productId: number;
  productItemId: number;
  name: string;
  /** 현재 판매가 */
  salePriceKrw: number;
  /** 정상가 — 판매가는 이걸 넘을 수 없다(토스 제약) */
  originPriceKrw: number;
  /** 실측 원가(배송비 포함) — 없으면 가격을 못 만진다 */
  landedCostKrw?: number;
  /** 토스 수수료율(0~1). 모르면 보수적으로 잡는다 */
  feeRate?: number;
  /** 등록 시각 */
  listedAt: string;
  /** 마지막으로 팔린 시각 — 한 번도 안 팔렸으면 없음 */
  lastSoldAt?: string;
  unitsSold30d: number;
  /** 자비스가 마지막으로 가격을 만진 시각 */
  lastPriceChangeAt?: string;
  /** 이미 숨겨진 상태인가 */
  hidden?: boolean;
};

export type OpsAction =
  | { kind: "cut_price"; sku: ListedSku; toPriceKrw: number; reason: string }
  | { kind: "hide"; sku: ListedSku; reason: string }
  | { kind: "hold"; sku: ListedSku; reason: string };

function daysBetween(iso: string | undefined, nowMs: number): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (nowMs - t) / 86_400_000 : Infinity;
}

/**
 * 더 내릴 수 없는 바닥.
 *
 * 판매가 × (1 - 수수료) - 원가 = 최소마진 × 판매가 를 판매가에 대해 푼 것.
 * 원가를 모르면 바닥을 알 수 없고, 바닥을 모르면 내려선 안 된다 — 그래서
 * 이 경우 null을 돌려주고 호출 쪽이 손대지 않는다.
 */
export function priceFloorKrw(sku: ListedSku): number | null {
  if (!sku.landedCostKrw || sku.landedCostKrw <= 0) return null;
  const fee = sku.feeRate ?? 0.12;
  const divisor = 1 - fee - FLOOR_NET_MARGIN;
  if (divisor <= 0) return null;
  return Math.ceil(sku.landedCostKrw / divisor);
}

/**
 * 이 상품을 지금 어떻게 할지 정한다.
 *
 * 순서가 중요하다. 팔리고 있으면 **아무것도 하지 않는다** — 잘 되는 걸
 * 건드리는 게 가장 흔한 실수다.
 */
export function decideForSku(sku: ListedSku, nowMs: number = Date.now()): OpsAction {
  if (sku.hidden) return { kind: "hold", sku, reason: "이미 숨김 상태" };

  // 팔리고 있으면 손대지 않는다. 가격을 내리면 지금 나는 이익만 깎인다.
  if (sku.unitsSold30d > 0 && daysBetween(sku.lastSoldAt, nowMs) < STALE_DAYS_NO_SALE) {
    return { kind: "hold", sku, reason: `최근 판매 있음 (30일 ${sku.unitsSold30d}개)` };
  }

  // 올린 지 얼마 안 됐으면 기다린다. 노출이 붙는 데 시간이 걸리는데,
  // 그 전에 가격을 내리면 "안 팔려서"가 아니라 "아직 안 보여서"인 걸
  // 가격 탓으로 오진하게 된다.
  const age = daysBetween(sku.listedAt, nowMs);
  if (age < STALE_DAYS_NO_SALE) {
    return { kind: "hold", sku, reason: `등록 ${Math.floor(age)}일차 — 노출이 붙는 중` };
  }

  // 최근에 만졌으면 결과를 지켜본다. 매일 흔들면 무엇이 효과였는지 영영 모른다.
  const sinceChange = daysBetween(sku.lastPriceChangeAt, nowMs);
  if (sinceChange < COOLDOWN_DAYS) {
    return { kind: "hold", sku, reason: `${Math.floor(sinceChange)}일 전 가격 조정 — 결과 관찰 중` };
  }

  const floor = priceFloorKrw(sku);
  if (floor == null) {
    // 원가를 모르면 얼마까지 내려도 되는지 알 수 없다. 모르면 안 만진다.
    return { kind: "hold", sku, reason: "실측 원가가 없어 얼마까지 내려도 되는지 알 수 없음" };
  }

  if (sku.salePriceKrw <= floor) {
    // 바닥이다. 여기서 더 내리면 팔릴수록 손해다.
    if (age >= GIVE_UP_DAYS_AT_FLOOR) {
      return {
        kind: "hide",
        sku,
        reason: `최저가(${floor.toLocaleString()}원)로 ${Math.floor(age)}일간 미판매 — 더 내리면 손해라 숨김`,
      };
    }
    return { kind: "hold", sku, reason: "이미 최저가 — 조금 더 지켜봄" };
  }

  // 한 계단 내린다. 바닥 밑으로는 안 간다.
  const step = Math.floor(sku.salePriceKrw * (MAX_CUT_PCT_PER_STEP / 100));
  const target = Math.max(floor, sku.salePriceKrw - step);
  // 990원 끝자리 — 가격 끝자리는 전환율에 실제로 영향을 준다
  const rounded = Math.max(floor, Math.round(target / 100) * 100 - 10);

  if (rounded >= sku.salePriceKrw) {
    return { kind: "hold", sku, reason: "내릴 여유가 남지 않음" };
  }
  const cutPct = Math.round(((sku.salePriceKrw - rounded) / sku.salePriceKrw) * 100);
  return {
    kind: "cut_price",
    sku,
    toPriceKrw: rounded,
    reason: `${Math.floor(age)}일간 미판매 — ${cutPct}% 인하 (최저 ${floor.toLocaleString()}원까지 여유 있음)`,
  };
}

export type OpsPlan = {
  cuts: Array<{ sku: ListedSku; toPriceKrw: number; reason: string }>;
  hides: Array<{ sku: ListedSku; reason: string }>;
  holds: number;
  /** 사람이 읽는 요약 — 대화창에 그대로 나간다 */
  summary: string[];
};

/** 한 사이클에 손대는 상품 수 상한 — 한꺼번에 흔들면 무엇이 원인인지 못 읽는다 */
export const MAX_ACTIONS_PER_CYCLE = 10;

export function planStoreOperations(
  skus: ListedSku[],
  nowMs: number = Date.now(),
): OpsPlan {
  const cuts: OpsPlan["cuts"] = [];
  const hides: OpsPlan["hides"] = [];
  let holds = 0;

  // 오래 방치된 것부터 본다 — 손실이 가장 오래 쌓인 쪽이 급하다
  const ordered = [...skus].sort(
    (a, b) => daysBetween(b.lastSoldAt ?? b.listedAt, nowMs) - daysBetween(a.lastSoldAt ?? a.listedAt, nowMs),
  );

  for (const sku of ordered) {
    const action = decideForSku(sku, nowMs);
    if (action.kind === "hold") {
      holds += 1;
      continue;
    }
    if (cuts.length + hides.length >= MAX_ACTIONS_PER_CYCLE) {
      holds += 1;
      continue;
    }
    if (action.kind === "cut_price") {
      cuts.push({ sku: action.sku, toPriceKrw: action.toPriceKrw, reason: action.reason });
    } else {
      hides.push({ sku: action.sku, reason: action.reason });
    }
  }

  const summary: string[] = [];
  if (cuts.length) summary.push(`가격 인하 ${cuts.length}건`);
  if (hides.length) summary.push(`숨김 ${hides.length}건`);
  if (!cuts.length && !hides.length) summary.push(`손댈 상품 없음 (${holds}개 정상)`);

  return { cuts, hides, holds, summary };
}
