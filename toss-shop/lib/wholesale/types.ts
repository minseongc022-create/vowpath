import type { SupplierQuality } from "./supplier-quality";
import type { SingleUnitSourcing } from "./domeggook-price";

export type WholesalePlatform = "domeggook" | "domeme" | "1688" | "taobao" | "rakuten" | "yahoo_jp";

export type WholesaleListing = {
  platform: WholesalePlatform;
  itemNo?: number;
  title: string;
  /**
   * 개당 공급가.
   *
   * ⚠️ 검색 응답에서 온 값이면 이건 **MOQ 수량으로 살 때의 개당 가격**이다.
   * MOQ가 1이 아니면 "1개 살 때의 가격"이 아니다. 낱개 원가로 쓰려면
   * `unitSourcing.verified`가 true여야 한다 (domeggook-price 참조).
   */
  unitPriceKrw: number;
  shippingFeeKrw: number;
  /** 최소구매수량. 판독 실패 시 UNKNOWN_MOQ(=위탁 불가에 해당하는 큰 값) */
  moq: number;
  /**
   * MOQ를 응답에서 실제로 읽었는가.
   *
   * false면 `moq` 값은 추측이 아니라 "모른다"는 표시다 — 낱개 발주가
   * 가능한지 확인되지 않았으므로 소싱해서는 안 된다.
   */
  moqVerified?: boolean;
  /**
   * 상세 조회로 확정한 낱개 발주 판정.
   *
   * 있으면 `unitPriceKrw`는 확인된 낱개 가격이다. 없으면 아직 확인 전이다.
   */
  unitSourcing?: SingleUnitSourcing;
  url: string;
  imageUrl?: string;
  /**
   * 공급사가 실제로 올린 상품 사진 전체 (상세 조회로 채워짐).
   *
   * 검색 API는 목록용 축소 썸네일 1장만 준다. 상세페이지에 사진이 한
   * 장뿐이면 "성의 없는 페이지"로 보여 전환율이 떨어진다 — 그렇다고
   * 지어낸 각도를 만들면 상품 왜곡이다. 상세 조회(getItemView)에 실려
   * 있는 공급사의 실제 사진들을 여기 채운다.
   */
  detailImageUrls?: string[];
  sellerId?: string;
  sellerNick?: string;
  freeShipping: boolean;
  source: "live" | "estimated";
  marginVsTossPct?: number;
  /** 공급사 등급·출고속도 (live 응답에서 판독; 미확인이면 verified:false) */
  supplierQuality?: SupplierQuality;
  /**
   * 공급처 반품·수거 안내 원문 (상세페이지·공지 등).
   *
   * 도매꾹 검색 API(getItemList)는 이 텍스트를 주지 않으므로 보통 비어 있다.
   * 비어 있으면 supplier-return-policy가 `unknown`으로 판정하고, 반품지 결정이
   * fail-closed로 막힌다(공급처 전용 주소 또는 셀러 자체 주소 선언 필요).
   * 플랫폼별 상세 조회를 붙이면 여기에 채워 넣으면 된다
   * (domeggook-detail.ts의 `enrichWithSupplierDetail`이 이 일을 한다).
   */
  policyText?: string;
  /**
   * 공급처 상세에서 판독한 **반품 주소**.
   *
   * 이게 있어야 반품지를 공급처 앞으로 자동 연결할 수 있다. 없으면 반품 물류
   * 두뇌가 셀러 경유로 돌리거나(비용 반영), 공급처 수거형이면 이 상품을 건너뛴다.
   */
  supplierReturnAddress?: string;
  /** 상세 조회를 시도했는가 — 시도조차 안 한 것과 시도했는데 못 읽은 것을 구분한다 */
  detailFetched?: boolean;
};

export type ImportSourceListing = {
  platform: WholesalePlatform;
  country: "중국" | "일본" | "베트남" | "미국";
  title: string;
  sourcePriceUsd: number;
  sourcePriceKrw: number;
  url: string;
  searchUrl: string;
  imageUrl?: string;
  source: "live" | "estimated";
  landedCostKrw?: number;
  estimatedMarginPct?: number;
};

export type WholesaleSearchResult = {
  keyword: string;
  listings: WholesaleListing[];
  bestMatch: WholesaleListing | null;
  searchedAt: string;
  apiConfigured: boolean;
};

export type ImportSourceResult = {
  keyword: string;
  primaryCountry: "중국" | "일본";
  china: ImportSourceListing[];
  japan: ImportSourceListing[];
  bestMatch: ImportSourceListing | null;
  sourcingBrief: string;
  searchedAt: string;
};
