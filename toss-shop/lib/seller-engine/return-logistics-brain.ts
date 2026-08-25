/**
 * 반품 물류 두뇌 — "이 상품의 반품은 어디로, 누구 비용으로 가야 하는가"
 *
 * ★ 이 파일이 하는 일
 *
 * 지금까지 반품지 결정은 규칙 하나였다: "공급처 수거형이면 막는다."
 * 그건 안전하지만 멍청하다. 막힌 상품은 사람이 손을 대야 하고, 공급처가
 * 상품마다 다른 도매꾹/도매매에서는 매일 손을 대야 한다는 뜻이 된다.
 *
 * 이 모듈은 대신 **사람이 하는 판단을 그대로 한다**. 반품 처리 방식, 공급처 주소를
 * 아는지, 토스에 그 주소가 등록돼 있는지, 셀러가 대신 받아줄 수 있는지, 그래서
 * 얼마가 드는지 — 변수를 전부 놓고 이 상품을 지금 팔 수 있는지, 팔면 얼마를
 * 감수하는지 결정한다. 그리고 못 팔면 왜 못 파는지와 무엇을 하면 풀리는지를 남긴다.
 *
 * ★ 네 가지 결론
 *
 *  · `supplier_direct`  — 공급처 전용 반품지가 확보됨. 반품 비용 0. 최선.
 *  · `seller_relay`     — 셀러가 받아서 공급처로 전달. 왕복비를 마진에서 미리 뺀다.
 *  · `needs_provisioning` — 공급처 주소는 알아냈는데 토스에 아직 없음.
 *                         등록 요청을 큐에 남기고 이 상품은 보류. 등록되면 자동 해제.
 *  · `rejected`         — 팔면 손해가 확정. 애초에 안 판다.
 *
 * ★ 비용을 "추정"하지 않는다
 *
 * 반품률은 실측이 없으면 알 수 없다. 그래서 이 모듈은 반품 비용을 예측하지 않고
 * **상한(worst case)** 으로 잡아 마진에서 미리 뺀다. 상한을 빼고도 남으면 판다.
 * 실측 반품률이 들어오면 그걸 쓰고, 없으면 보수적 상한을 쓰되 `confidence`에
 * "가정"이라고 남긴다 — 추정치를 사실처럼 쓰지 않기 위해서다.
 */

import type { TossReturnLocation } from "../api/return-location-lookup";
import {
  jarvisLocationName,
  matchReturnLocation,
  type ReturnLocationMatch,
} from "../api/return-location-matcher";
import {
  needsSupplierAddress,
  returnHandlingLabel,
  type SupplierReturnPolicy,
} from "../wholesale/supplier-return-policy";

export const RETURN_LOGISTICS_BRAIN_VERSION = "1.0";

/**
 * 실측 반품률이 없을 때 쓰는 **보수적 상한**.
 *
 * 예측값이 아니라 버퍼다. 국내 오픈마켓 생활·공산품 반품률은 보통 한 자릿수
 * 초반이지만, 카테고리와 시즌에 따라 흔들린다. 그래서 그보다 넉넉한 8%를
 * 상한으로 두고 "이만큼 반품이 나도 남는가"를 따진다. 정산 데이터가 쌓이면
 * `measuredReturnRate`로 실측을 넣어 이 상한을 대체한다.
 */
export const ASSUMED_RETURN_RATE_CEILING = 0.08;

/** 반품 1건에서 셀러가 실제로 부담하게 되는 택배 구간 수 (고객→셀러, 셀러→공급처) */
const RELAY_LEGS = 2;

/** 반품 택배비를 모를 때 쓰는 국내 표준 단가 — 실제 배송비를 알면 그걸 쓴다 */
const DEFAULT_COURIER_FEE_KRW = 3_500;

export type ReturnRoute = "supplier_direct" | "seller_relay" | "needs_provisioning" | "rejected";

/** 사장님이 토스 셀러센터에서 한 번만 하면 되는 일 */
export type ProvisioningRequest = {
  supplierPlatform: string;
  supplierId: string;
  supplierNick?: string;
  /** 등록할 주소 */
  address: string;
  /** 이 이름으로 등록하면 자비스가 자동으로 물어간다 */
  suggestedName: string;
  /** 왜 이 공급처만 별도 반품지가 필요한가 */
  why: string;
};

export type ReturnLogisticsDecision = {
  engineVersion: string;
  route: ReturnRoute;
  /** 결정된 토스 반품지 ID — route가 supplier_direct/seller_relay일 때만 */
  locationId?: number;
  /** 반품지가 어떻게 정해졌는지 */
  match?: ReturnLocationMatch;
  /**
   * 이 결정으로 **판매 1건당** 미리 빼둘 반품 비용(원).
   * 반품 1건 비용이 아니라, 반품률 상한을 곱한 단위당 충당금이다.
   */
  reservePerUnitKrw: number;
  /** 반품 1건이 실제로 터졌을 때의 비용 — 사람이 체감할 수 있게 함께 남긴다 */
  costPerReturnKrw: number;
  /**
   * · `confirmed` — 반품 처리 방식이 텍스트로 확인됐고 반품지도 확정됐다
   * · `probable`  — 반품지는 확정됐으나 처리 방식은 관행에 기댄 판단이다
   * · `assumed`   — 처리 방식·비용 모두 가정에 기댄다. 상한을 빼고도 남을 때만 판다
   */
  confidence: "confirmed" | "probable" | "assumed";
  /** 판단 과정 — 사후에 "왜 이렇게 정했나"를 추적할 수 있게 남긴다 */
  reasoning: string[];
  /** 사장님이 해야 할 일 (없으면 완전 자동으로 끝난 것) */
  provisioning?: ProvisioningRequest;
  /** 팔면 안 되는 이유 (route가 rejected일 때) */
  rejectReason?: string;
  /**
   * 무엇 때문에 막혔는가 — 대응이 완전히 다르므로 반드시 구분한다.
   *
   * · `policy`        — 공급처가 반품을 안 받는다. 이 상품을 버리면 끝.
   * · `supplier`      — 이 공급처의 반품 주소가 없다. 다른 후보로 넘어가면 된다.
   * · `economics`     — 반품 충당금을 빼면 안 남는다. 이 상품만의 문제.
   * · `global_config` — 셀러 반품지 자체가 설정되지 않았다. **전 상품이 막힌다.**
   *                     이건 다음 후보로 넘어가도 소용없으므로, 조용히 건너뛰지 않고
   *                     사장님께 설정하라고 알려야 한다.
   */
  blocker?: "policy" | "supplier" | "economics" | "global_config";
};

export type ReturnLogisticsInput = {
  policy: SupplierReturnPolicy;
  supplierPlatform: string;
  supplierId?: string;
  supplierNick?: string;
  /** 공급처 상세에서 읽어낸 반품 주소 (도매꾹 getItemView) */
  supplierReturnAddress?: string;
  /** 토스에 등록된 반품지 전체 */
  registeredLocations: TossReturnLocation[];
  /** 셀러 자체 반품지 ID — 선언된 경우에만 들어온다 */
  sellerOwnedLocationId?: number;
  /** 이 상품의 배송비 — 반품 왕복비를 추정할 때의 기준 */
  shippingFeeKrw?: number;
  /**
   * 공급처 안내에서 **실제로 읽어낸** 반품 왕복 배송비.
   *
   * 있으면 배송비로 추정하지 않고 이 값을 쓴다. 공급처가 "반품비 8,000원"이라고
   * 적어뒀는데 상품 배송비(3,000원)로 6,000원을 잡으면 건당 2,000원씩 샌다.
   */
  measuredReturnShippingKrw?: number;
  /** 판매 1건당 순이익 — 반품 충당금을 빼고도 남는지 따진다 */
  netProfitPerUnitKrw?: number;
  /** 실측 반품률 (0~1). 정산 데이터가 있으면 넣는다 — 없으면 보수적 상한을 쓴다 */
  measuredReturnRate?: number;
};

// ─────────────────────────────────────────────────────────────
// 비용
// ─────────────────────────────────────────────────────────────

function courierFee(shippingFeeKrw: number | undefined): number {
  const fee = shippingFeeKrw ?? 0;
  // 무료배송(0원)이라도 반품 택배는 실제로 돈이 나간다 — 표준 단가로 대체한다
  return fee > 0 ? fee : DEFAULT_COURIER_FEE_KRW;
}

function relayCostPerReturn(shippingFeeKrw: number | undefined): number {
  return courierFee(shippingFeeKrw) * RELAY_LEGS;
}

function reserve(costPerReturn: number, rate: number): number {
  return Math.round(costPerReturn * rate);
}

// ─────────────────────────────────────────────────────────────
// 판단
// ─────────────────────────────────────────────────────────────

/**
 * 반품 주소를 어디서 얻을 수 있는지 훑는다.
 *
 * 상세 API에서 읽은 주소(구조화된 필드)가 안내문 정규식으로 긁은 주소보다 낫다.
 * 안내문 쪽은 제조사 주소나 매장 주소가 섞여 들어올 수 있어서 후순위로 둔다.
 */
function resolveSupplierAddress(input: ReturnLogisticsInput): {
  address?: string;
  source: "detail_api" | "policy_text" | "none";
} {
  if (input.supplierReturnAddress?.trim()) {
    return { address: input.supplierReturnAddress.trim(), source: "detail_api" };
  }
  if (input.policy.detectedAddress?.trim()) {
    return { address: input.policy.detectedAddress.trim(), source: "policy_text" };
  }
  return { source: "none" };
}

export function decideReturnLogistics(input: ReturnLogisticsInput): ReturnLogisticsDecision {
  const reasoning: string[] = [];
  const base = { engineVersion: RETURN_LOGISTICS_BRAIN_VERSION, reasoning };
  const { policy } = input;
  const handling = policy.handling;

  const rate = input.measuredReturnRate ?? ASSUMED_RETURN_RATE_CEILING;
  const rateIsMeasured = input.measuredReturnRate != null;
  // 공급처가 반품비를 명시했으면 그 값이 진실이다 — 배송비로 추정하지 않는다
  const relayCost = input.measuredReturnShippingKrw ?? relayCostPerReturn(input.shippingFeeKrw);

  reasoning.push(
    `반품 처리 방식: ${returnHandlingLabel(handling)}${policy.verified ? " (안내문에서 확인)" : " (안내문에 명시 없음)"}`,
  );

  // ── 1) 반품 자체가 안 되는 공급처는 애초에 안 판다 ──────────────
  //
  // 토스는 청약철회를 보장해야 한다. 공급처가 반품을 안 받으면 그 비용을
  // 셀러가 전액 떠안는다. 마진이 아무리 좋아도 이건 팔면 지는 게임이다.
  if (handling === "refused") {
    return {
      ...base,
      route: "rejected",
      reservePerUnitKrw: 0,
      costPerReturnKrw: 0,
      confidence: "confirmed",
      blocker: "policy",
      rejectReason:
        `반품 불가 공급처 — ${policy.reason} ` +
        "토스는 청약철회를 보장해야 하므로 반품 비용을 셀러가 전액 부담하게 됩니다.",
    };
  }

  const { address, source: addressSource } = resolveSupplierAddress(input);

  // ── 2) 이미 등록된 반품지 중에 이 공급처 것이 있는가 ────────────
  //
  // 이름 태그 → 주소 일치 순으로 찾는다. 걸리면 사람이 매핑을 쓸 필요가 없다.
  const match = matchReturnLocation({
    locations: input.registeredLocations,
    supplierAddress: address,
    supplierPlatform: input.supplierPlatform,
    supplierId: input.supplierId,
  });

  if (match) {
    reasoning.push(match.reason);
    return {
      ...base,
      route: "supplier_direct",
      locationId: match.location.id,
      match,
      reservePerUnitKrw: 0,
      costPerReturnKrw: 0,
      confidence: policy.verified ? "confirmed" : "probable",
      reasoning: [
        ...reasoning,
        "반품이 공급처로 직행하므로 셀러가 부담하는 반품 물류비는 없습니다.",
      ],
    };
  }

  // ── 3) 공급처 전용 주소가 반드시 필요한 경우 ────────────────────
  //
  // 수거형이든 택배 반송형이든, 물건이 공급처로 가야 한다는 점은 같다.
  // 셀러 주소로 걸면 "내 상품이 아닌데 나한테 반품이 오는" 상황이 확정된다.
  if (needsSupplierAddress(handling)) {
    if (address && input.supplierId) {
      // 주소는 알아냈다 — 토스에 등록만 되면 자동으로 풀린다.
      reasoning.push(
        `공급처 반품 주소를 ${addressSource === "detail_api" ? "상세 조회" : "반품 안내문"}에서 확보했으나 토스에 등록된 반품지 중 일치하는 곳이 없습니다.`,
      );
      return {
        ...base,
        route: "needs_provisioning",
        reservePerUnitKrw: 0,
        costPerReturnKrw: relayCost,
        confidence: "confirmed",
        provisioning: {
          supplierPlatform: input.supplierPlatform,
          supplierId: input.supplierId,
          supplierNick: input.supplierNick,
          address,
          suggestedName: jarvisLocationName(input.supplierPlatform, input.supplierId),
          why:
            `${returnHandlingLabel(handling)} 공급처입니다. 반품이 이 주소로 직행해야 ` +
            `셀러가 왕복 택배비(건당 약 ${relayCost.toLocaleString()}원)를 물지 않습니다.`,
        },
      };
    }

    // 주소조차 못 읽었다. 셀러 주소로 대신 거는 건 금지 — 확인된 수거형이므로
    // 반품이 셀러에게 오면 안 되는 상품이다. 이 후보는 넘기고 다음으로 간다.
    reasoning.push(
      address
        ? "공급사 ID를 판독하지 못해 공급처 단위 반품지를 만들 수 없습니다."
        : "공급처 반품 주소를 상세 조회·안내문 어디에서도 읽지 못했습니다.",
    );
    return {
      ...base,
      route: "rejected",
      reservePerUnitKrw: 0,
      costPerReturnKrw: relayCost,
      confidence: "confirmed",
      blocker: "supplier",
      rejectReason:
        `${returnHandlingLabel(handling)} 공급처인데 반품 주소를 확보하지 못했습니다. ` +
        "셀러 주소로 대신 등록하면 남의 상품 반품을 셀러가 받게 되므로 이 상품은 건너뜁니다.",
    };
  }

  // ── 4) 셀러가 받아도 되는 경우 ──────────────────────────────────
  //
  // seller_handles(확인됨) 또는 unknown(안내문 자체가 없는 절대다수).
  // 국내 위탁 관행상 반품 안내가 없으면 셀러가 접점이 되는 게 일반적이다.
  // 다만 공짜가 아니다 — 왕복비를 마진에서 미리 뺀다.
  if (!input.sellerOwnedLocationId) {
    reasoning.push("셀러 자체 반품지가 선언되지 않아 이 상품을 등록할 수 없습니다.");
    return {
      ...base,
      route: "rejected",
      reservePerUnitKrw: 0,
      costPerReturnKrw: relayCost,
      confidence: "assumed",
      blocker: "global_config",
      rejectReason:
        "셀러 자체 반품지가 없습니다 — TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID와 " +
        "TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED=true를 설정하세요.",
    };
  }

  const isVerifiedSellerHandling = handling === "seller_handles";
  // 셀러 처리형으로 확인됐으면 원래 셀러가 받는 게 맞으므로 재발송 구간이 없다.
  const costPerReturn = isVerifiedSellerHandling ? courierFee(input.shippingFeeKrw) : relayCost;
  const reservePerUnit = reserve(costPerReturn, rate);

  reasoning.push(
    isVerifiedSellerHandling
      ? "셀러가 직접 처리하는 공급처로 확인돼 셀러 자체 반품지로 등록합니다."
      : "반품 안내가 없어 처리 주체가 확인되지 않았습니다. 국내 위탁 관행상 셀러가 반품 접점이 되므로 셀러 자체 반품지로 등록하되, 공급처로 재발송해야 할 경우를 비용에 미리 반영합니다.",
  );
  reasoning.push(
    `반품 1건당 약 ${costPerReturn.toLocaleString()}원 · 반품률 ${(rate * 100).toFixed(1)}%` +
      `${rateIsMeasured ? " (실측)" : " (실측 없음 — 보수적 상한)"} → 판매 1건당 ${reservePerUnit.toLocaleString()}원 충당`,
  );

  // 충당금을 빼면 남는 게 없는 상품은 팔 이유가 없다.
  if (input.netProfitPerUnitKrw != null && input.netProfitPerUnitKrw - reservePerUnit <= 0) {
    return {
      ...base,
      route: "rejected",
      reservePerUnitKrw: reservePerUnit,
      costPerReturnKrw: costPerReturn,
      confidence: isVerifiedSellerHandling ? "probable" : "assumed",
      blocker: "economics",
      rejectReason:
        `반품 충당금 ${reservePerUnit.toLocaleString()}원을 빼면 순이익이 ` +
        `${input.netProfitPerUnitKrw.toLocaleString()}원 → ${(input.netProfitPerUnitKrw - reservePerUnit).toLocaleString()}원으로 남지 않습니다.`,
    };
  }

  return {
    ...base,
    route: "seller_relay",
    locationId: input.sellerOwnedLocationId,
    reservePerUnitKrw: reservePerUnit,
    costPerReturnKrw: costPerReturn,
    confidence: isVerifiedSellerHandling ? "probable" : "assumed",
  };
}

/** 이 결정으로 지금 등록이 가능한가 */
export function canPublishWithDecision(
  d: ReturnLogisticsDecision,
): d is ReturnLogisticsDecision & { locationId: number } {
  return (
    (d.route === "supplier_direct" || d.route === "seller_relay") &&
    typeof d.locationId === "number" &&
    d.locationId > 0
  );
}

export function returnRouteLabel(route: ReturnRoute): string {
  return route === "supplier_direct"
    ? "공급처 반품지 직행"
    : route === "seller_relay"
      ? "셀러 경유"
      : route === "needs_provisioning"
        ? "반품지 등록 대기"
        : "판매 제외";
}
