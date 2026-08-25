/**
 * 반품 결정 파이프라인 — 상품 하나가 "지금 팔 수 있는가"까지 한 번에 판단한다
 *
 * 흩어져 있던 네 단계를 하나로 묶는다:
 *
 *   1. 상세 조회   — 검색 응답에 없는 반품 안내·공급처 주소를 가져온다
 *   2. 정책 판독   — 수거형인지, 택배 반송형인지, 셀러 처리형인지, 불가인지
 *   3. 반품지 매칭 — 토스에 등록된 반품지 중 이 공급처 것을 찾는다
 *   4. 물류 판단   — 지금 팔 수 있는가, 팔면 얼마를 감수하는가
 *
 * ★ 왜 하나로 묶는가
 *
 * 이 넷은 따로 쓰면 의미가 없다. 상세를 안 가져오면 정책이 전부 `unknown`이 되고,
 * 정책을 모르면 매칭이 맞는지 알 수 없고, 매칭이 없으면 판단할 근거가 없다.
 * 무인 등록은 이 사슬이 끊기지 않을 때만 성립한다.
 *
 * ★ 토스 반품지 목록은 사이클당 한 번만 읽는다
 *
 * 상품마다 조회하면 5개 등록에 5번 호출한다. 반품지는 자주 안 바뀌므로
 * 사이클 시작에 한 번 읽어 넘겨 쓴다 — 호출 수를 줄이는 게 아니라,
 * 같은 사이클 안에서 판단 기준이 흔들리지 않게 하기 위해서다.
 */

import type { TossReturnLocation } from "../api/return-location-lookup";
import { enrichWithSupplierDetail } from "../wholesale/domeggook-detail";
import { readSupplierReturnPolicy } from "../wholesale/supplier-return-policy";
import type { WholesaleListing } from "../wholesale/types";
import {
  decideReturnLogistics,
  type ReturnLogisticsDecision,
} from "./return-logistics-brain";

export const RETURN_PIPELINE_VERSION = "1.0";

export type ReturnDecisionInput = {
  listing: WholesaleListing;
  /** 사이클 시작에 한 번 읽어둔 토스 반품지 목록 */
  registeredLocations: TossReturnLocation[];
  /** 셀러 자체 반품지 ID — 선언된 경우에만 */
  sellerOwnedLocationId?: number;
  /** 판매 1건당 순이익 — 반품 충당금을 빼고도 남는지 따진다 */
  netProfitPerUnitKrw?: number;
  /** 정산에서 나온 실측 반품률이 있으면 넣는다 */
  measuredReturnRate?: number;
  /**
   * 상세 조회를 건너뛴다 (이미 보강된 listing을 넘길 때).
   * 테스트에서도 네트워크 없이 돌리기 위해 쓴다.
   */
  skipDetailFetch?: boolean;
};

export type ReturnDecisionResult = {
  engineVersion: string;
  /** 상세 조회로 보강된 리스팅 — 이후 단계는 이걸 써야 한다 */
  listing: WholesaleListing;
  decision: ReturnLogisticsDecision;
  /** 반품 안내로 확인된 사실 — 상세페이지 안심 문구로 그대로 쓴다 */
  returnNote?: string;
};

/**
 * 반품 안내 문구를 만든다 — 확인된 사실만.
 *
 * 상세페이지의 "받아봤는데 다르면 어떡하지"에 답하는 문장이 된다.
 * 반품 경로가 확정되지 않았으면 아무 말도 하지 않는다. 애매한 반품 안내는
 * 안 쓰느니만 못하고, 분쟁에서 셀러에게 불리하게 해석된다.
 */
function buildReturnNote(decision: ReturnLogisticsDecision): string | undefined {
  if (decision.route === "supplier_direct") {
    return "단순 변심 반품이 가능합니다. 반품 접수 시 공급처로 바로 회수되며, 왕복 배송비는 상품 상세의 반품 배송비 기준을 따릅니다.";
  }
  if (decision.route === "seller_relay") {
    return "단순 변심 반품이 가능합니다. 반품 배송비는 상품 상세의 반품 배송비 기준을 따릅니다.";
  }
  return undefined;
}

/**
 * 상품 하나에 대해 반품 결정을 끝까지 낸다.
 *
 * 결과의 `decision.route`로 다음 행동이 정해진다:
 *  · supplier_direct / seller_relay → 지금 등록 가능
 *  · needs_provisioning             → 반품지 등록 요청을 큐에 쌓고 다음 후보로
 *  · rejected                       → 이 상품은 버린다
 */
export async function decideReturnForListing(
  input: ReturnDecisionInput,
): Promise<ReturnDecisionResult> {
  const listing = input.skipDetailFetch
    ? input.listing
    : await enrichWithSupplierDetail(input.listing);

  const policy = readSupplierReturnPolicy(listing.policyText);

  const decision = decideReturnLogistics({
    policy,
    supplierPlatform: listing.platform,
    supplierId: listing.sellerId,
    supplierNick: listing.sellerNick,
    supplierReturnAddress: listing.supplierReturnAddress,
    registeredLocations: input.registeredLocations,
    sellerOwnedLocationId: input.sellerOwnedLocationId,
    shippingFeeKrw: listing.shippingFeeKrw,
    netProfitPerUnitKrw: input.netProfitPerUnitKrw,
    measuredReturnRate: input.measuredReturnRate,
  });

  // 상세를 못 읽었다는 사실을 판단 근거에 남긴다 — 나중에 "왜 unknown이었나"를
  // 추적할 때 API 문제였는지 안내문이 원래 없었는지 구분할 수 있어야 한다.
  if (listing.detailFetched === false) {
    decision.reasoning.unshift(
      "공급처 상세 조회에 실패해 반품 안내를 확인하지 못했습니다 — 검색 응답만으로 판단했습니다.",
    );
  }

  return {
    engineVersion: RETURN_PIPELINE_VERSION,
    listing,
    decision,
    returnNote: buildReturnNote(decision),
  };
}
