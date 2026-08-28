/**
 * 가격 타당성 게이트 — 말이 안 되는 숫자는 어디서 왔든 통과시키지 않는다
 *
 * ★ 왜 이 파일이 생겼는가 — 2,700만원짜리 위탁 SKU가 만들어졌다
 *
 * 검수 화면에 이런 상품이 떴다:
 *
 *     에피로드 태블릿케이스 블루투스 이어폰 ANC
 *     8% 27,195,670원 (정가 29,560,511원)
 *
 * 태블릿 케이스가 2,700만원일 수는 없다. 그런데 파이프라인의 어느 단계도
 * 이걸 막지 못했다 — 마진 게이트는 통과했기 때문이다. 원가가 900만원이면
 * 판매가 2,700만원에서 마진 15%는 **수학적으로 성립한다.** 비율만 보는
 * 게이트는 자릿수가 틀린 걸 잡아내지 못한다.
 *
 * ★ 이 게이트가 다른 게이트와 다른 점
 *
 * 확실성 게이트(certainty-gate)는 "근거가 실측인가"를 본다.
 * 마진 게이트는 "비율이 충분한가"를 본다.
 * 이 게이트는 **"숫자 자체가 현실적인가"**를 본다. 앞의 둘이 아무리 잘
 * 통과해도, 값의 크기가 상식을 벗어나면 그건 데이터가 잘못 들어온 것이다.
 *
 * 자릿수 오류는 조용히 지나가면 가장 비싸다. 광고가 걸리면 노출당 비용이
 * 그대로 나가고, 실수로 등록되면 고객이 잘못된 가격을 보게 되며,
 * 토스 정책상 가격 오등록은 페널티 사유다.
 *
 * ★ 상한을 어떻게 정했는가 — 임의의 숫자가 아니다
 *
 * 이 시스템은 **위탁판매**를 한다. 위탁은 주문이 들어온 뒤 공급처에
 * 1개를 발주하는 구조라, 다루는 물건의 성격이 정해져 있다:
 *  · 도매꾹·도매매에서 낱개로 살 수 있어야 한다
 *  · 재고를 안 떠안으므로 고가 상품을 다룰 이유가 없다
 *  · 광고비를 태워 회전시키는 모델이라 객단가가 지나치게 높으면 전환이 안 난다
 *
 * 실제로 도매매 낱개 상품의 절대다수는 몇천 원~몇만 원대다. 수십만 원대는
 * 드물고, 수백만 원대는 위탁 낱개 상품으로 존재하기 어렵다. 그래서 상한을
 * **300만원**으로 둔다 — 정상 범위를 넉넉히 덮으면서 자릿수 오류(수천만 원)는
 * 확실히 걸러내는 선이다.
 *
 * ⚠️ 이 값은 관측이 아니라 판단이다. 실제로 300만원짜리 정상 상품이 걸리면
 * 그때 근거를 갖고 올리면 된다. 다만 **막지 않는 것보다는 막는 쪽이 싸다** —
 * 잘못 막으면 기회를 하나 놓치지만, 잘못 통과시키면 돈이 나간다.
 */

export const PRICE_SANITY_VERSION = "1.0";

/** 위탁 낱개 상품의 현실적 판매가 상한 */
export const MAX_CONSIGNMENT_PRICE_KRW = 3_000_000;
/** 위탁 낱개 상품의 현실적 공급가 상한 (판매가 상한과 같은 근거) */
export const MAX_CONSIGNMENT_COST_KRW = 2_000_000;
/**
 * 최소 판매가.
 *
 * 이 밑은 주문 한 건마다 붙는 배송비가 마진을 통째로 먹어서 위탁이
 * 성립하지 않는다. 도매꾹엔 200원짜리 머리끈이 실제로 있지만 그걸
 * 팔아서 남는 건 없다 (domeggook-api의 정렬 주석에 같은 관측이 있다).
 */
export const MIN_CONSIGNMENT_PRICE_KRW = 3_000;

/**
 * 판매가가 원가 대비 몇 배까지 정상인가.
 *
 * 위탁 마진은 보통 15~50%다. 원가의 5배가 넘는 판매가는 마진이 좋은 게
 * 아니라 **둘 중 하나가 잘못 들어온 것**이다 — 원가가 낱개가 아니거나,
 * 판매가가 묶음가이거나.
 */
export const MAX_PRICE_TO_COST_RATIO = 5;

export type PriceSanityVerdict = {
  engineVersion: string;
  /** 이 숫자들로 상품을 만들어도 되는가 */
  sane: boolean;
  /** 사람이 읽는 사유 — 왜 막혔는지 그대로 남긴다 */
  reason: string;
  /** 어떤 검사에 걸렸는가 — 진단용 */
  failed?:
    | "price_too_high"
    | "price_too_low"
    | "cost_too_high"
    | "ratio_too_high"
    | "not_finite";
};

const ok = (reason: string): PriceSanityVerdict => ({
  engineVersion: PRICE_SANITY_VERSION,
  sane: true,
  reason,
});

/**
 * 공급가만 먼저 본다 — 판매가가 아직 안 정해진 단계용.
 *
 * 소싱 초입에서는 원가만 알고 판매가는 그 뒤에 계산된다. 그런데 원가가
 * 이미 틀렸으면(묶음가가 낱개가로 들어왔으면) 그 위에 쌓이는 가격·마진·
 * 수익 전망이 전부 무의미하다. 그러니 원가를 아는 순간 바로 본다.
 */
export function checkSupplierCostSanity(supplierCostKrw: number): PriceSanityVerdict {
  if (!Number.isFinite(supplierCostKrw) || supplierCostKrw <= 0) {
    return {
      engineVersion: PRICE_SANITY_VERSION,
      sane: false,
      failed: "not_finite",
      reason: `공급가가 유효한 숫자가 아님(${supplierCostKrw})`,
    };
  }
  if (supplierCostKrw > MAX_CONSIGNMENT_COST_KRW) {
    return {
      engineVersion: PRICE_SANITY_VERSION,
      sane: false,
      failed: "cost_too_high",
      reason:
        `공급가 ${supplierCostKrw.toLocaleString()}원 — 위탁 낱개 상한 ` +
        `${MAX_CONSIGNMENT_COST_KRW.toLocaleString()}원 초과. ` +
        `낱개가가 아니라 묶음 전체 가격이 들어왔을 가능성이 높다`,
    };
  }
  return ok(`공급가 ${supplierCostKrw.toLocaleString()}원 — 정상 범위`);
}

/**
 * 이 가격·원가 조합이 위탁 상품으로 현실적인가.
 *
 * fail-closed: 숫자가 유한하지 않거나 0 이하면 통과시키지 않는다.
 * 계산이 어디선가 NaN이 됐다는 뜻이고, NaN은 비교 연산을 전부 통과해버려
 * 뒤쪽 게이트가 못 잡는다.
 */
export function checkPriceSanity(input: {
  priceKrw: number;
  supplierCostKrw?: number;
}): PriceSanityVerdict {
  const { priceKrw, supplierCostKrw } = input;

  if (!Number.isFinite(priceKrw) || priceKrw <= 0) {
    return {
      engineVersion: PRICE_SANITY_VERSION,
      sane: false,
      failed: "not_finite",
      reason: `판매가가 유효한 숫자가 아님(${priceKrw}) — 계산 어딘가가 깨졌다`,
    };
  }

  if (priceKrw > MAX_CONSIGNMENT_PRICE_KRW) {
    return {
      engineVersion: PRICE_SANITY_VERSION,
      sane: false,
      failed: "price_too_high",
      reason:
        `판매가 ${priceKrw.toLocaleString()}원 — 위탁 낱개 상품 상한 ` +
        `${MAX_CONSIGNMENT_PRICE_KRW.toLocaleString()}원을 넘는다. ` +
        `공급가가 묶음 전체 가격으로 들어왔을 가능성이 높다`,
    };
  }

  if (priceKrw < MIN_CONSIGNMENT_PRICE_KRW) {
    return {
      engineVersion: PRICE_SANITY_VERSION,
      sane: false,
      failed: "price_too_low",
      reason:
        `판매가 ${priceKrw.toLocaleString()}원 — 배송비가 마진을 먹어 위탁이 성립하지 않는다 ` +
        `(하한 ${MIN_CONSIGNMENT_PRICE_KRW.toLocaleString()}원)`,
    };
  }

  if (supplierCostKrw !== undefined) {
    if (!Number.isFinite(supplierCostKrw) || supplierCostKrw <= 0) {
      return {
        engineVersion: PRICE_SANITY_VERSION,
        sane: false,
        failed: "not_finite",
        reason: `공급가가 유효한 숫자가 아님(${supplierCostKrw})`,
      };
    }

    if (supplierCostKrw > MAX_CONSIGNMENT_COST_KRW) {
      return {
        engineVersion: PRICE_SANITY_VERSION,
        sane: false,
        failed: "cost_too_high",
        reason:
          `공급가 ${supplierCostKrw.toLocaleString()}원 — 위탁 낱개 상한 ` +
          `${MAX_CONSIGNMENT_COST_KRW.toLocaleString()}원 초과. 낱개가가 아니라 묶음가일 가능성이 높다`,
      };
    }

    const ratio = priceKrw / supplierCostKrw;
    if (ratio > MAX_PRICE_TO_COST_RATIO) {
      return {
        engineVersion: PRICE_SANITY_VERSION,
        sane: false,
        failed: "ratio_too_high",
        reason:
          `판매가가 공급가의 ${ratio.toFixed(1)}배 — 정상 위탁 마진(15~50%)의 범위를 벗어난다. ` +
          `원가가 낱개가가 아니거나 판매가가 묶음가일 수 있다`,
      };
    }
  }

  return ok(
    supplierCostKrw
      ? `판매가 ${priceKrw.toLocaleString()}원 · 공급가 ${supplierCostKrw.toLocaleString()}원 — 정상 범위`
      : `판매가 ${priceKrw.toLocaleString()}원 — 정상 범위`,
  );
}
