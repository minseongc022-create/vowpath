/**
 * 카탈로그 진입 전략 — "대장 상품과 똑같이 올리면 안 팔린다" 문제의 해법
 *
 * 문제(공식 문서로 확인된 구조):
 *  · 토스는 동일 상품을 하나의 카탈로그로 묶고 **대표 아이템만 대표 노출**한다.
 *  · 대표 선정 기준은 **배송비 포함 총 가격 최저**.
 *  · 광고 문서상 '대표 노출 미선정'이면 광고조차 `노출 제한`이 걸린다.
 *  → 대장이 있는 카탈로그에 같은 상품으로 들어가면 자연노출·광고 모두 0이 된다.
 *
 * 왜 "가격을 더 싸게"가 답이 아닌가 (위탁판매 한정):
 *  위탁은 나도 대장도 같은 도매처에서 같은 공급가로 사온다. 즉 원가 우위가 없다.
 *  가격을 낮추면 그만큼 내 마진만 사라지고, 대장이 맞받아 내리면 바닥까지 간다.
 *  구조적 우위 없이 벌이는 가격 경쟁은 마진만 태우고 끝난다.
 *
 * 진짜 해법 (공식 매칭 로직이 열어둔 문):
 *  "모델명·용량·구성 중 하나라도 다르면 별도 카탈로그로 분리된다."
 *  → 2입·3입 묶음으로 올리면 **대장이 없는 새 카탈로그**가 생기고 내가 대표가 된다.
 *  → 게다가 묶음은 배송비가 1건분만 들어 단위 마진이 오히려 개선된다.
 *
 * 이 엔진은 세 선택지의 기대수익을 계산해 최선을 고르고, 셋 다 수익이 안 되면
 * **소싱 자체를 거부**한다 ("적은 돈으로 상단 노출 가능한 상품만" 요구의 구현).
 */

import { TOSS_DEFAULT_SALES_FEE_RATE, TOSS_PAYMENT_FEE_RATE } from "./toss-policy-engine";

export const CATALOG_ENTRY_VERSION = "1.0";

export type CatalogEntryInput = {
  /** 도매 공급가 (1개) */
  supplierUnitKrw: number;
  /** 도매 배송비 (주문 1건당, 묶음이어도 1회) */
  supplierShippingKrw: number;
  /** 대장(현 대표 아이템)의 판매가 */
  incumbentPriceKrw: number;
  /** 대장의 배송비 (0이면 무료배송) */
  incumbentShippingKrw: number;
  /** 이 카테고리의 하루 예상 판매량 (단품 기준) */
  baselineDailyUnits: number;
  /** 최소 허용 마진율 % */
  minMarginPct?: number;
};

export type EntryOption = {
  strategy: "undercut" | "bundle_2" | "bundle_3" | "reject";
  label: string;
  /** 내 판매가 */
  priceKrw: number;
  /** 내 총가격(배송비 포함) */
  totalKrw: number;
  /** 단위 순익 */
  netProfitKrw: number;
  marginPct: number;
  /** 대표 아이템을 딸 수 있는가 */
  winsRepresentative: boolean;
  /** 별도 카탈로그로 분리되는가 (대장과 경쟁 자체를 피함) */
  separateCatalog: boolean;
  /** 하루 기대 순익 */
  dailyProfitKrw: number;
  note: string;
};

export type CatalogEntryVerdict = {
  best: EntryOption;
  options: EntryOption[];
  /** 소싱해도 되는가 */
  sourceable: boolean;
  reason: string;
};

function fees(priceKrw: number): number {
  return Math.round(priceKrw * (TOSS_DEFAULT_SALES_FEE_RATE + TOSS_PAYMENT_FEE_RATE));
}

/**
 * 묶음 판매 시 수요 감소.
 * 객단가가 오르면 구매 전환이 줄지만, 묶음은 "쟁여두는" 수요가 있어
 * 가격에 정비례해 줄지는 않는다. 보수적으로 잡는다.
 */
function bundleDemandFactor(qty: number): number {
  return qty === 2 ? 0.55 : qty === 3 ? 0.35 : 1;
}

function buildBundle(input: CatalogEntryInput, qty: number): EntryOption {
  const minMargin = input.minMarginPct ?? 15;
  // 묶음은 배송비가 1건분만 든다 — 이게 단위 마진 개선의 핵심
  const cost = input.supplierUnitKrw * qty + input.supplierShippingKrw;

  // 단품 가격 × 수량에서 묶음 할인을 준다 (고객이 묶음을 살 이유)
  const bundleDiscount = qty === 2 ? 0.93 : 0.88;
  let price = Math.round((input.incumbentPriceKrw * qty * bundleDiscount) / 10) * 10;

  // 최소 마진 미달이면 마진 기준으로 올린다
  const floor = Math.ceil(
    cost / (1 - (TOSS_DEFAULT_SALES_FEE_RATE + TOSS_PAYMENT_FEE_RATE) - minMargin / 100),
  );
  if (price < floor) price = Math.ceil(floor / 10) * 10;

  const net = price - cost - fees(price);
  const marginPct = Math.round((net / price) * 1000) / 10;

  // 고객은 언제든 대장 단품을 qty개 살 수 있다. 내 묶음이 그보다 비싸면
  // 별도 카탈로그로 노출돼도 아무도 사지 않는다 — 마진 하한 때문에 가격이
  // 시장가 위로 밀려 올라간 경우가 여기 해당한다.
  const singlesReference = input.incumbentPriceKrw * qty;
  const priceAdvantage = (singlesReference - price) / singlesReference;
  const uncompetitive = price >= singlesReference;

  const daily = uncompetitive
    ? 0
    : Math.round(net * input.baselineDailyUnits * bundleDemandFactor(qty));

  return {
    strategy: qty === 2 ? "bundle_2" : "bundle_3",
    label: `${qty}입 묶음 구성`,
    priceKrw: price,
    totalKrw: price,
    netProfitKrw: net,
    marginPct,
    // 구성이 다르므로 공식 매칭 로직상 별도 카탈로그로 분리된다
    winsRepresentative: !uncompetitive,
    separateCatalog: true,
    dailyProfitKrw: daily,
    note: uncompetitive
      ? `묶음가 ${price.toLocaleString()}원이 대장 단품 ${qty}개(${singlesReference.toLocaleString()}원)보다 비싸다 — ` +
        `별도 카탈로그로 노출돼도 고객은 대장을 ${qty}번 산다. 마진 하한 때문에 시장가 위로 밀린 경우`
      : `구성이 달라 별도 카탈로그 — 대장과 경쟁하지 않고 내가 대표. ` +
        `단품 ${qty}개 대비 ${Math.round(priceAdvantage * 100)}% 저렴하고, 배송비 1건분만 들어 단위마진 ${marginPct}%`,
  };
}

function buildUndercut(input: CatalogEntryInput): EntryOption {
  const minMargin = input.minMarginPct ?? 15;
  const cost = input.supplierUnitKrw + input.supplierShippingKrw;

  // 대장의 총가격보다 10원 낮춰야 대표를 딴다 (배송비 포함 총가격 기준)
  const incumbentTotal = input.incumbentPriceKrw + input.incumbentShippingKrw;
  const price = incumbentTotal - 10; // 무료배송 전제 → 판매가 = 총가격

  const net = price - cost - fees(price);
  const marginPct = price > 0 ? Math.round((net / price) * 1000) / 10 : -100;
  const viable = net > 0 && marginPct >= minMargin;
  const daily = viable ? Math.round(net * input.baselineDailyUnits) : 0;

  return {
    strategy: "undercut",
    label: "최저가 경쟁 (대표 탈환)",
    priceKrw: price,
    totalKrw: price,
    netProfitKrw: net,
    marginPct,
    winsRepresentative: viable,
    separateCatalog: false,
    dailyProfitKrw: daily,
    note: viable
      ? `대장 총가격 ${incumbentTotal.toLocaleString()}원보다 10원 낮춰 대표 탈환 (마진 ${marginPct}%). ` +
        `단, 대장이 맞받아 내리면 원가 우위가 없어 재역전당한다`
      : `대장가 대비 마진 ${marginPct}% — 최소 ${minMargin}% 미달. 가격 경쟁으로는 수익이 안 난다`,
  };
}

/**
 * 세 선택지를 계산해 하루 기대 순익이 가장 큰 것을 고른다.
 * 셋 다 수익이 안 되면 소싱을 거부한다 — 노출도 못 받고 마진도 없는 상품을
 * 올리는 건 재고·CS·페널티 리스크만 늘린다.
 */
export function decideCatalogEntry(input: CatalogEntryInput): CatalogEntryVerdict {
  const options: EntryOption[] = [
    buildUndercut(input),
    buildBundle(input, 2),
    buildBundle(input, 3),
  ];

  const viable = options.filter((o) => o.netProfitKrw > 0 && o.dailyProfitKrw > 0);
  viable.sort((a, b) => b.dailyProfitKrw - a.dailyProfitKrw);

  if (!viable.length) {
    const reject: EntryOption = {
      strategy: "reject",
      label: "소싱 거부",
      priceKrw: 0,
      totalKrw: 0,
      netProfitKrw: 0,
      marginPct: 0,
      winsRepresentative: false,
      separateCatalog: false,
      dailyProfitKrw: 0,
      note: "어떤 진입 방식으로도 수익이 나지 않는다",
    };
    return {
      best: reject,
      options,
      sourceable: false,
      reason:
        "대장과 같은 카탈로그에서는 마진이 안 나오고, 묶음 구성으로도 수익이 안 난다 — " +
        "노출도 못 받는 상품을 올리면 재고·CS·페널티 리스크만 는다. 다른 키워드로 재탐색",
    };
  }

  const best = viable[0];
  const undercut = options.find((o) => o.strategy === "undercut")!;

  return {
    best,
    options,
    sourceable: true,
    reason:
      best.strategy === "undercut"
        ? `최저가 진입이 최선 (하루 ${best.dailyProfitKrw.toLocaleString()}원) — 단, 대장이 맞받으면 재검토 필요`
        : `${best.label} 선택 — 하루 ${best.dailyProfitKrw.toLocaleString()}원. ` +
          `최저가 경쟁(${undercut.dailyProfitKrw.toLocaleString()}원/일, 마진 ${undercut.marginPct}%)보다 유리하고, ` +
          `별도 카탈로그라 대장과 가격 싸움 자체를 하지 않는다`,
  };
}
