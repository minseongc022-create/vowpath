/**
 * 변수 처리 — 승인하는 순간 공급처가 그대로인지 다시 본다
 *
 * ★ 무엇이 문제였나
 *
 * 초안은 아침에 만들어지고 승인은 저녁에 날 수 있다. 그 사이 공급처는
 * 값을 올리기도 하고, 상품을 내리기도 하고, 낱개 판매를 막고 묶음 전용으로
 * 바꾸기도 한다. 그런데 승인 게이트는 **초안에 적힌 원가**를 다시 검사할
 * 뿐이었다 — 그 숫자는 만들 때 찍힌 값이라, 몇 시간 전 세상이 그대로라는
 * 전제 위에서만 맞다. 통과한다고 해서 지금도 그 값이라는 뜻이 아니다.
 *
 * 그래서 실제로 이런 일이 난다:
 *   · 원가가 올라 마진이 사라졌는데 그대로 등록 → 팔릴수록 손해
 *   · 품절인데 등록 → 주문은 들어오고 발주는 못 함 → 취소·페널티
 *
 * ★ 무엇을 하는가
 *
 * 승인 시점에 공급처를 **캐시 없이** 다시 읽고, 세 갈래로 나눈다.
 *
 *   그대로다        → 통과
 *   싸졌거나 조금 올랐다 → 지금 원가로 가격을 다시 정해서 통과
 *   못 판다          → 막는다 (품절·낱개 불가·원가가 기준 밖)
 *
 * 값이 바뀌었는데 조용히 옛 숫자로 등록하는 경우만은 절대 없어야 한다.
 * 그건 사장님이 승인한 상품과 실제로 팔리는 상품이 다른 것이다.
 */

import { confirmSingleUnitSourcing } from "@/jarvis/wholesale/domeggook-api";
import type { SingleUnitSourcing } from "@/jarvis/wholesale/domeggook-price";
import { decidePrice } from "../core/rules";
import { computeAdBreakeven } from "../core/money";
import type { Candidate } from "../core/types";

export const REVALIDATE_VERSION = "1.0";

export type Revalidation =
  | {
      ok: true;
      /** 지금 값으로 갱신된 후보 — 바뀐 게 없으면 원본과 같다 */
      candidate: Candidate;
      /** 값이 바뀌어 다시 계산했는가 */
      changed: boolean;
      /** 사장님에게 보여줄 한 줄 */
      note: string;
    }
  | { ok: false; reason: string };

/**
 * 조회가 안 될 때 어떻게 할 것인가.
 *
 * 도매꾹이 잠깐 응답을 안 준다고 승인을 막으면 사장님이 아무것도 못 한다.
 * 반대로 그냥 통과시키면 품절 상품을 등록할 수 있다. 그래서 **조회 실패는
 * 통과시키되 그 사실을 남긴다** — 판독 실패와 "확인된 품절"은 다른 일이다.
 * 확인된 나쁜 소식만 막는다.
 */
export async function revalidateCandidate(c: Candidate): Promise<Revalidation> {
  let unit: SingleUnitSourcing;
  try {
    unit = await confirmSingleUnitSourcing(c.supplier.itemNo, { fresh: true });
  } catch {
    return {
      ok: true,
      candidate: c,
      changed: false,
      note: "공급처를 다시 확인하지 못했습니다(일시적 오류) — 발주 전 한 번 봐주세요",
    };
  }
  return decideRevalidation(c, unit);
}

/**
 * 조회 결과를 놓고 내리는 판단 — 네트워크가 없는 순수 함수다.
 *
 * 조회(I/O)와 판단을 갈라 둔 이유: 판단은 돈이 걸린 규칙이라 실제 값들로
 * 빠짐없이 시험해야 하는데, 여기에 fetch가 섞여 있으면 "품절일 때 정말
 * 막히는가"를 확인할 방법이 도매꾹 서버 사정에 달려버린다.
 */
export function decideRevalidation(
  c: Candidate,
  unit: SingleUnitSourcing,
): Revalidation {
  // 조회는 됐는데 판독이 안 된 경우 — 모른다는 뜻이지 나쁘다는 뜻이 아니다
  if (!unit.verified) {
    return {
      ok: true,
      candidate: c,
      changed: false,
      note: `공급처 재확인 미완료 (${unit.reason}) — 발주 전 한 번 봐주세요`,
    };
  }

  // 여기부터는 **확인된** 사실이다
  if (!unit.available || unit.unitPriceKrw == null) {
    return {
      ok: false,
      reason: `공급처에서 지금은 살 수 없습니다 — ${unit.reason}. 등록하면 주문을 못 채웁니다.`,
    };
  }
  if (unit.minOrderQty != null && unit.minOrderQty > 1) {
    return {
      ok: false,
      reason: `공급처가 최소 ${unit.minOrderQty}개부터 팔도록 바뀌었습니다 — 낱개 위탁이 안 됩니다.`,
    };
  }

  const nowCostKrw = unit.unitPriceKrw + c.supplier.shippingKrw;
  if (nowCostKrw === c.supplier.landedCostKrw) {
    return { ok: true, candidate: c, changed: false, note: "공급처 원가 그대로입니다" };
  }

  // 값이 바뀌었다 — 옛 가격을 그대로 쓰지 않고 지금 원가로 다시 정한다
  const pricing = decidePrice({
    landedCostKrw: nowCostKrw,
    competitorLowKrw: c.competitorLowKrw,
  });

  const diff = nowCostKrw - c.supplier.landedCostKrw;
  const direction = diff > 0 ? "올랐" : "내렸";
  const move = `공급처 원가가 ${c.supplier.landedCostKrw.toLocaleString()}원 → ${nowCostKrw.toLocaleString()}원으로 ${direction}습니다`;

  if (!pricing.ok) {
    return { ok: false, reason: `${move}. ${pricing.reason}` };
  }

  const ad = computeAdBreakeven({
    priceKrw: pricing.priceKrw,
    netProfitKrw: pricing.netProfitKrw,
  });

  const candidate: Candidate = {
    ...c,
    supplier: {
      ...c.supplier,
      unitPriceKrw: unit.unitPriceKrw,
      landedCostKrw: nowCostKrw,
      moq: unit.minOrderQty ?? 1,
      singleUnitVerified: true,
      live: true,
    },
    priceKrw: pricing.priceKrw,
    netProfitKrw: pricing.netProfitKrw,
    marginPct: pricing.marginPct,
    priceFloorKrw: pricing.floorKrw,
    pricingReason: pricing.reason,
    maxBidKrw: ad.maxBidKrw,
    breakevenCpcKrw: ad.breakevenCpcKrw,
  };

  return {
    ok: true,
    candidate,
    changed: true,
    note:
      `${move}. 등록가를 ${c.priceKrw.toLocaleString()}원 → ` +
      `${pricing.priceKrw.toLocaleString()}원으로 다시 정했습니다 ` +
      `(개당 ${pricing.netProfitKrw.toLocaleString()}원 남음).`,
  };
}
