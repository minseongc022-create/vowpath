import type { WholesaleListing, WholesaleSearchResult } from "./types";
import {
  isDomeggookApiConfigured,
  searchAllKoreanWholesale,
  withConfirmedUnitPricing,
} from "./domeggook-api";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * ⚠️ 키워드 해시로 공급가를 지어내는 함수다 — import-sources.ts가 저지른
 * 것과 정확히 같은 종류의 실수다. 여기 남아 있는 이유는 API 키가 아예 없을 때
 * 화면이 완전히 비는 걸 막기 위해서다.
 *
 * 이 값으로 **실제 발주를 하면 안 된다.** `source: "estimated"`가 붙고,
 * 확실성 게이트(certainty-gate)가 `cost_live`를 필수 실측으로 요구하므로
 * 등록까지 가지는 않는다. 하지만 화면의 마진·수익 숫자는 오염시키므로,
 * API 키가 설정된 상태에서는 절대 이 경로로 내려오지 않게 한다.
 */
function estimateListings(keyword: string, tossAvgPriceKrw: number): WholesaleListing[] {
  const h = hashString(keyword);
  const base = Math.round(tossAvgPriceKrw * (0.38 + (h % 12) / 100));
  const platforms: WholesaleListing["platform"][] = ["domeggook", "domeme"];

  return platforms.map((platform, i) => {
    const price = base + i * (200 + (h % 500));
    const itemNo = 7_000_000 + (h % 900_000) + i;
    const url =
      platform === "domeggook"
        ? `https://www.domeggook.com/main/item/itemList.php?sword=${encodeURIComponent(keyword)}`
        : `https://domemedb.domeggook.com/index/item/supplyList.php?keyword=${encodeURIComponent(keyword)}`;

    return {
      platform,
      itemNo,
      title: `${keyword} 위탁 공급 (${platform === "domeggook" ? "도매꾹" : "도매매"})`,
      unitPriceKrw: price,
      shippingFeeKrw: platform === "domeme" ? 2500 : 0,
      moq: 1,
      url,
      freeShipping: platform === "domeggook",
      source: "estimated" as const,
    };
  });
}

export function landedWholesaleUnitCost(listing: WholesaleListing): number {
  return listing.unitPriceKrw + (listing.freeShipping ? 0 : listing.shippingFeeKrw);
}

export function attachMarginVsToss(listings: WholesaleListing[], tossRetailKrw: number): WholesaleListing[] {
  return listings.map((l) => {
    const cost = landedWholesaleUnitCost(l);
    const margin = tossRetailKrw > 0 ? Math.round(((tossRetailKrw - cost) / tossRetailKrw) * 1000) / 10 : 0;
    return { ...l, marginVsTossPct: margin };
  });
}

/**
 * 위탁으로 실제 발주할 공급처를 고른다.
 *
 * ★ 종전엔 마지막에 MOQ를 통째로 무시했다
 *
 *     const scored = withMargin.sort(...);           // MOQ 조건 없음
 *     return scored[0] ?? listings.sort(...)[0];     // 마진 조건마저 없음
 *
 * 앞의 두 단계가 MOQ 1을 찾아보긴 하지만, 못 찾으면 **MOQ가 10이든 100이든
 * 가장 싼 것**을 돌려줬다. 그리고 그 묶음 단가가 `supplierCostKrw`가 되어
 * 마진·가격·수익 계산 전체의 바닥이 됐다. 사용자가 관측한 "1개씩 파는데
 * 2개 가격으로 가져와지는" 증상이 정확히 이 경로다.
 *
 * 위탁은 주문이 들어온 뒤 1개를 발주한다. 1개를 못 사는 공급처는 **후보가
 * 아니다** — 싸다는 건 아무 의미가 없다. 그래서 이제 낱개 발주가 확인된
 * 것만 고르고, 없으면 null을 돌려준다. 없는 걸 없다고 말해야 상위 게이트가
 * 그 키워드를 건너뛸 수 있다.
 */
export function pickBestWholesaleMatch(
  listings: WholesaleListing[],
  tossRetailKrw: number,
  minMarginPct = 12,
): WholesaleListing | null {
  const withMargin = attachMarginVsToss(listings, tossRetailKrw).filter(
    (l) => (l.marginVsTossPct ?? 0) >= minMarginPct,
  );

  // 낱개 발주가 성립하는 것만 후보다.
  //  · unitSourcing이 있으면 상세 조회로 확정된 것 — 가장 강한 근거
  //  · 없으면 검색 응답의 MOQ를 보되, **판독된 값일 때만** 인정한다
  //    (moqVerified=false는 "MOQ를 모른다"는 뜻이지 1이라는 뜻이 아니다)
  const singleUnit = withMargin.filter((l) => {
    if (l.unitSourcing) return l.unitSourcing.available;
    if (l.source === "estimated") return l.moq <= 1; // 추정 데이터는 게이트가 따로 막는다
    return l.moqVerified === true && l.moq <= 1;
  });

  if (!singleUnit.length) return null;

  // 도매매(낱개 배송대행)를 우선한다 — 위탁에 맞는 구조다
  const cheapest = (arr: WholesaleListing[]) =>
    [...arr].sort((a, b) => landedWholesaleUnitCost(a) - landedWholesaleUnitCost(b))[0];

  const domeme = singleUnit.filter((l) => l.platform === "domeme");
  return domeme.length ? cheapest(domeme) : cheapest(singleUnit);
}

export async function searchWholesaleForConsignment(input: {
  keyword: string;
  tossAvgPriceKrw: number;
  targetRetailKrw?: number;
}): Promise<WholesaleSearchResult> {
  const target = input.targetRetailKrw ?? input.tossAvgPriceKrw;
  const apiConfigured = isDomeggookApiConfigured();
  let listings = apiConfigured ? await searchAllKoreanWholesale(input.keyword, 6) : [];

  // ★ 낱개 발주 가능 여부를 상세 조회로 확정한다.
  //
  // 검색 응답의 단가는 그 상품 MOQ 기준이라, 1개만 파는 위탁에는 그대로 쓸 수
  // 없다. 여기서 상품번호로 상세를 조회해 도매매 가격(price.supply)과 구매단위를
  // 확인하고, **확인된 낱개 가격으로 단가를 교체**한다. 확인 안 되는 상품은
  // 목록에서 빠진다 — 묶음 전용 상품을 낱개 원가로 계산하는 것이 이 버그의 핵심이었다.
  if (apiConfigured && listings.length) {
    const confirmed = await withConfirmedUnitPricing(listings);
    // 전부 탈락하면 추정으로 내려가지 않고 빈 상태로 둔다. "낱개로 살 수 있는
    // 공급처가 없다"는 사실이고, 그걸 추정 데이터로 덮으면 없는 기회를 만들어낸다.
    listings = confirmed;
  }

  if (!listings.length && !apiConfigured) {
    listings = estimateListings(input.keyword, input.tossAvgPriceKrw);
  }

  listings = listings.sort((a, b) => {
    const score = (l: WholesaleListing) =>
      (l.platform === "domeme" ? 100 : 0) + (l.moq <= 1 ? 50 : 0) + (l.source === "live" ? 25 : 0);
    return score(b) - score(a);
  });

  listings = attachMarginVsToss(listings, target);
  const bestMatch = pickBestWholesaleMatch(listings, target, 10);

  return {
    keyword: input.keyword,
    listings: listings.slice(0, 6),
    bestMatch,
    searchedAt: new Date().toISOString(),
    apiConfigured,
  };
}
