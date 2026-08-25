/**
 * 무인 처리 가능 공급처 선별 — 막힐 곳은 **애초에 고르지 않는다**
 *
 * ★ 왜 이 필터가 필요한가 (실측으로 확정된 제약)
 *
 * 2026-08 실측 결과, 토스 교환·반품지 API는 **읽기만 된다**:
 *   POST /merchants/group-delivery/exchange-refund-location/v2 → 405 잘못된 http method
 * 게다가 반품지 응답에는 **이름 필드조차 없다**(id·zipCode·address·detailAddress·isMain).
 * 즉 새 반품 주소는 사람이 셀러센터에서 만들어야 하고, 연결은 주소 일치로만 된다.
 *
 * 이 제약 아래에서 "완전 무인"을 만드는 방법은 하나뿐이다:
 * **셀러가 이미 가진 반품지로 처리되는 공급처만 소싱한다.**
 *
 * 공급처가 자기 주소로 반품을 받아야만 하는 곳(직접수거형·택배반송형)은
 * 그 주소가 토스에 등록돼 있지 않으면 무슨 수를 써도 자동으로 못 판다.
 * 그런 후보를 소싱 목록에 담아두면 매 사이클 상세를 조회했다가 버리는 낭비가 되고,
 * 사장님에게는 "등록해달라"는 요청만 쌓인다. 그건 무인이 아니다.
 *
 * 도매매는 배송대행(B2B) 서비스이고 셀러가 통신판매업자다. 반품 안내가 따로 없는
 * 절대다수 상품은 셀러가 반품 접점이 되는 게 정상 운영이다. 그래서 이 필터를
 * 통과하는 후보만으로도 하루치 등록은 충분히 채워진다 — 도매매 공급사는 수천 곳이다.
 *
 * ★ 그래도 버리지는 않는다
 *
 * 걸러진 공급처는 사라지는 게 아니라 `deferred`로 분류된다. 반복해서 나타나고
 * 돈이 되는 곳은 프로비저닝 큐가 사장님께 한 번 올리고, 그 주소가 등록되는 순간
 * 이 필터를 통과하게 된다 — 손대는 횟수가 시간이 갈수록 준다.
 */

import type { TossReturnLocation } from "../api/return-location-lookup";
import { findLocationByAddress } from "../api/return-location-matcher";
import { needsSupplierAddress, readSupplierReturnPolicy } from "./supplier-return-policy";
import type { WholesaleListing } from "./types";

export const AUTONOMY_FILTER_VERSION = "1.0";

export type AutonomyVerdict =
  /** 지금 가진 반품지로 끝까지 자동 처리된다 */
  | "autonomous"
  /** 공급처 전용 주소가 필요한데 토스에 없다 — 등록되면 자동으로 풀린다 */
  | "needs_address"
  /** 반품 자체가 안 되는 공급처 — 등록해도 못 판다 */
  | "unsellable";

export type AutonomyCheck = {
  engineVersion: string;
  verdict: AutonomyVerdict;
  /** 사람이 읽는 판정 근거 */
  reason: string;
  /** 이 상품에 쓸 수 있는 반품지 ID (autonomous일 때) */
  locationId?: number;
};

export type AutonomyInput = {
  listing: WholesaleListing;
  /** 토스에 등록된 반품지 전체 */
  registeredLocations: TossReturnLocation[];
  /** 셀러 자체 반품지 ID — 선언된 경우에만 */
  sellerOwnedLocationId?: number;
};

/**
 * 이 공급처 상품을 사람 손 없이 끝까지 올릴 수 있는가.
 *
 * ⚠️ 이 판정은 **검색 응답만으로** 내린다. 상세 조회(getItemView)를 하기 전
 * 단계에서 후보를 좁히는 게 목적이기 때문이다 — 상세를 다 조회한 다음 버리면
 * API 호출만 태우고 아무것도 못 얻는다.
 *
 * 그래서 여기서의 판정은 보수적이다: 검색 응답의 안내문에서 "공급처 주소가
 * 필요하다"는 신호가 **명확히 잡힐 때만** 걸러낸다. 안내문이 없어 판독이 안 되는
 * 절대다수는 통과시키고, 상세 조회 뒤 반품 물류 두뇌가 최종 판단한다.
 */
export function checkSupplierAutonomy(input: AutonomyInput): AutonomyCheck {
  const base = { engineVersion: AUTONOMY_FILTER_VERSION };
  const { listing, registeredLocations, sellerOwnedLocationId } = input;

  const policy = readSupplierReturnPolicy(listing.policyText);

  if (policy.handling === "refused") {
    return {
      ...base,
      verdict: "unsellable",
      reason:
        "반품 불가 공급처 — 토스는 청약철회를 보장해야 하므로 반품 비용을 셀러가 전액 부담하게 됩니다.",
    };
  }

  // 공급처 주소가 필요한 경우: 그 주소가 이미 토스에 있으면 자동, 없으면 보류.
  if (needsSupplierAddress(policy.handling)) {
    const address = listing.supplierReturnAddress ?? policy.detectedAddress;
    const existing = address ? findLocationByAddress(registeredLocations, address) : null;
    if (existing) {
      return {
        ...base,
        verdict: "autonomous",
        locationId: existing.id,
        reason: `공급처 반품 주소가 등록된 반품지(${existing.id})와 일치해 자동 처리됩니다.`,
      };
    }
    return {
      ...base,
      verdict: "needs_address",
      reason: address
        ? "공급처 전용 반품 주소가 토스에 등록되어 있지 않습니다 — 등록되면 자동으로 풀립니다."
        : "공급처가 자기 주소로 반품을 받는 곳인데 그 주소를 알아내지 못했습니다.",
    };
  }

  // 셀러가 받아도 되는 경우 — 셀러 자체 반품지가 있어야 한다.
  if (!sellerOwnedLocationId) {
    return {
      ...base,
      verdict: "needs_address",
      reason:
        "셀러 자체 반품지가 설정되지 않아 어떤 상품도 등록할 수 없습니다 — 설정에서 반품지를 지정하세요.",
    };
  }

  return {
    ...base,
    verdict: "autonomous",
    locationId: sellerOwnedLocationId,
    reason:
      policy.handling === "seller_handles"
        ? "셀러가 직접 처리하는 공급처로 확인돼 셀러 자체 반품지로 자동 처리됩니다."
        : "반품 안내가 없어 처리 주체가 확인되지 않았습니다 — 셀러 자체 반품지로 처리하되 왕복비를 비용에 반영합니다.",
  };
}

export type PartitionResult = {
  /** 지금 바로 무인 등록 가능한 후보 */
  autonomous: WholesaleListing[];
  /** 반품지가 등록되면 풀리는 후보 */
  deferred: WholesaleListing[];
  /** 등록해도 못 파는 후보 */
  unsellable: WholesaleListing[];
};

/**
 * 후보 목록을 처리 가능성으로 나눈다.
 *
 * 소싱은 `autonomous`만 쓴다. `deferred`는 프로비저닝 큐가 참고하고,
 * `unsellable`은 버린다.
 */
export function partitionByAutonomy(
  listings: WholesaleListing[],
  ctx: Omit<AutonomyInput, "listing">,
): PartitionResult {
  const out: PartitionResult = { autonomous: [], deferred: [], unsellable: [] };
  for (const listing of listings) {
    const check = checkSupplierAutonomy({ ...ctx, listing });
    if (check.verdict === "autonomous") out.autonomous.push(listing);
    else if (check.verdict === "needs_address") out.deferred.push(listing);
    else out.unsellable.push(listing);
  }
  return out;
}
