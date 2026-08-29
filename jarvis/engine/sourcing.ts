/**
 * 소싱 — 도매에서 팔 수 있는 상품을 찾아낸다
 *
 * ★ 원칙 하나: 모르면 안 올린다
 *
 * 이 파이프라인의 모든 판정은 **실측이 있을 때만** 통과시킨다. 낱개 발주가
 * 되는지 모르면 제외하고, 원가를 못 읽으면 제외한다. 추정으로 채우면 그
 * 추정 위에 마진·수익·광고예산이 전부 쌓이고, 마지막 게이트가 막아줘도
 * 그때까지 화면의 숫자가 이미 거짓이 된다.
 *
 * ★ 원칙 둘: 왜 떨어졌는지 항상 남긴다
 *
 * "등록할 상품이 없습니다"만 반복되면 기준을 낮추고 싶어진다. 하지만 기준은
 * 손익분기선이라 낮추면 적자를 승인하는 것과 같다. 대신 **어느 관문에서 몇
 * 개가 떨어졌는지**를 항상 남겨, 넓혀야 할 곳(검색어·도매 소스)을 숫자로
 * 가리킨다.
 */

import {
  searchAllKoreanWholesale,
  confirmSingleUnitSourcing,
  isDomeggookApiConfigured,
  getLastDomeggookError,
  clearDomeggookError,
} from "@/jarvis/wholesale/domeggook-api";
import type { WholesaleListing } from "@/jarvis/wholesale/types";
import { checkCost, decidePrice, MIN_RELEVANCE } from "../core/rules";
import { computeAdBreakeven } from "../core/money";
import type { Candidate, SourcingRun, Supplier } from "../core/types";
import { getKeywords } from "./keywords";
import { scoreRelevance, buildTitle } from "./relevance";

export const SOURCING_VERSION = "2.0";

/**
 * 한 사이클에 쓰는 상세조회 예산.
 *
 * 낱개 확인은 상품 하나당 도매꾹 API를 한 번씩 부른다. 후보가 수십 개인데
 * 전부 조회하면 분당 수십 건이 되어 레이트리밋에 걸리고, 그러면 **전부**
 * 판독 실패로 떨어져 자동화가 조용히 멈춘다. 예산을 넘기면 이번 사이클은
 * 접고 다음 사이클이 이어서 본다(조회 결과는 캐시된다).
 */
const DETAIL_BUDGET = 40;

/** 검색어 하나당 살펴볼 도매 상품 수 */
const PER_KEYWORD_LIMIT = 6;

/**
 * 한 사이클에 기본으로 훑는 검색어 수.
 *
 * ★ 왜 24가 아니라 이 값인가
 *
 * 검색어를 훑는 것 자체(searchAllKoreanWholesale)는 후보가 하나도 안
 * 나와도 시간과 API 호출을 쓴다. 24개로는 검색어 풀(수백 개) 전체를
 * 도는 데 여러 사이클이 걸려 "왜 이렇게 좁게 찾나"는 불만이 나올 만했다.
 * 이 값을 넉넉히 올려도 안전한 이유는 실제 상한이 이 숫자가 아니라
 * **시간(deadlineAt)**이기 때문이다 — 아래 루프가 마감을 넘기면 몇 개가
 * 남았든 즉시 멈춘다. 그래서 "많이 훑되, 시간이 되는 만큼만"이 자동으로
 * 성립한다.
 */
const DEFAULT_KEYWORD_COUNT = 60;

export type SourcingInput = {
  /** 몇 개를 찾으면 멈출지 */
  want: number;
  /** 검색어를 몇 개나 훑을지 */
  keywordCount?: number;
  /** 지난 사이클에서 이어서 훑기 위한 위치 */
  keywordOffset?: number;
  /** 이미 갖고 있는 상품 — 같은 걸 또 소싱하지 않게 */
  existingSupplierKeys?: Set<string>;
  /** 이 시각을 넘으면 찾던 것까지만 하고 정상 종료한다 */
  deadlineAt?: number;
};

export type SourcingResult = {
  candidates: Candidate[];
  run: SourcingRun;
};

export function supplierKey(platform: string, itemNo: string): string {
  return `${platform}:${itemNo}`;
}

export async function sourceCandidates(input: SourcingInput): Promise<SourcingResult> {
  const startedAt = Date.now();
  const rejections = new Map<string, number>();
  const bump = (why: string, n = 1) => rejections.set(why, (rejections.get(why) ?? 0) + n);

  const candidates: Candidate[] = [];
  const seenSuppliers = new Set(input.existingSupplierKeys ?? []);
  let keywordsTried = 0;
  let productsSeen = 0;
  let detailBudget = DETAIL_BUDGET;

  if (!isDomeggookApiConfigured()) {
    return {
      candidates: [],
      run: {
        ranAt: new Date().toISOString(),
        keywordsTried: 0,
        productsSeen: 0,
        candidatesFound: 0,
        rejections: { "도매꾹 API 키 미설정": 1 },
        summary:
          "도매꾹 API 키가 없어 소싱을 시작할 수 없습니다. 연동 설정에서 DOMEGGOOK_API_KEY를 넣어주세요.",
        elapsedMs: Date.now() - startedAt,
      },
    };
  }

  // 이번 사이클 시작 전에 지난 오류를 비운다 — 안 비우면 지난번 오류가
  // 이번에도 "최근 오류"로 잡혀, 실제로는 이번엔 성공했는데도 헷갈리게 된다.
  clearDomeggookError();

  const keywords = getKeywords(input.keywordCount ?? DEFAULT_KEYWORD_COUNT, input.keywordOffset ?? 0);

  for (const seed of keywords) {
    if (candidates.length >= input.want) break;
    if (input.deadlineAt && Date.now() > input.deadlineAt) {
      bump("시간 초과로 다음 사이클로 넘김");
      break;
    }
    if (detailBudget <= 0) {
      bump("도매 API 조회 예산 소진 — 다음 사이클에 이어서 봅니다");
      break;
    }

    keywordsTried++;

    let listings: WholesaleListing[] = [];
    try {
      listings = await searchAllKoreanWholesale(seed.keyword, PER_KEYWORD_LIMIT);
    } catch {
      bump("도매 검색 실패(일시적 오류)");
      continue;
    }

    if (!listings.length) {
      // ★ "상품이 없다"와 "API를 못 읽었다"는 다른 상황인데 여기서는
      // 둘 다 빈 배열로 보인다 — searchDomeggookMarket이 인증 실패·IP
      // 제한 같은 오류도 예외를 던지지 않고 조용히 []를 돌려주기 때문이다
      // (도매꾹이 그런 오류도 HTTP 200에 담아 보낸다). 실측: 무선이어폰부터
      // 캠핑의자까지 전혀 다른 카테고리 24개가 전부 "상품 없음"으로 잡힌 적이
      // 있었는데, 실제 원인은 API 키 오류였다 — 수백만 개짜리 도매 마켓에서
      // 서로 다른 24개 검색어가 전부 진짜 0건일 수는 없다. getLastDomeggookError
      // 로 진짜 이유를 가져와 구분한다.
      const apiError = getLastDomeggookError();
      if (apiError) {
        bump(`도매꾹 오류: ${apiError.message}`);
      } else {
        bump("도매에 이 검색어로 나오는 상품이 없음");
      }
      continue;
    }

    for (const listing of listings) {
      if (candidates.length >= input.want) break;
      if (detailBudget <= 0) break;

      productsSeen++;

      const itemNo = listing.itemNo != null ? String(listing.itemNo) : "";
      if (!itemNo) {
        bump("공급처 상품번호를 못 읽음");
        continue;
      }

      const key = supplierKey(listing.platform, itemNo);
      if (seenSuppliers.has(key)) {
        bump("이미 소싱한 상품");
        continue;
      }

      // ── 1. 키워드와 상품이 같은 물건인가 ─────────────────────
      //
      // 이걸 안 보면 "무선이어폰 주방 세제" 같은 제목이 만들어진다.
      // 잘못된 키워드는 제목만 망치는 게 아니라 검색 키워드·광고 집행·
      // 상세 문구까지 전부 오염시킨다.
      const relevance = scoreRelevance(seed.keyword, listing.title);
      if (relevance < MIN_RELEVANCE) {
        bump("검색어와 상품이 다른 물건");
        continue;
      }

      // ── 2. 낱개로 실제로 살 수 있는가 ────────────────────────
      //
      // 검색 응답의 단가는 그 상품 MOQ 기준 개당 가격이라 낱개 값이 아니다.
      // 상세 조회로 확정하지 않으면 묶음가가 낱개 원가 자리에 들어간다 —
      // 2,700만원 사고의 근원이 정확히 이것이었다.
      detailBudget--;
      let unit;
      try {
        unit = await confirmSingleUnitSourcing(itemNo);
      } catch {
        bump("낱개 발주 확인 실패(일시적 오류)");
        continue;
      }

      if (!unit.available || !unit.verified || unit.unitPriceKrw == null) {
        bump("낱개(1개) 발주가 안 되는 묶음 전용 상품");
        continue;
      }
      if (unit.minOrderQty != null && unit.minOrderQty > 1) {
        bump("최소 주문수량이 2개 이상");
        continue;
      }

      // ── 3. 원가 확정 ─────────────────────────────────────────
      //
      // landed = 낱개 단가 + 입고 배송비. 마진은 **항상** 이 값으로만 잰다.
      const shippingKrw = listing.freeShipping ? 0 : Math.max(0, listing.shippingFeeKrw ?? 0);
      const landedCostKrw = unit.unitPriceKrw + shippingKrw;

      const costGate = checkCost(landedCostKrw);
      if (!costGate.ok) {
        bump(costGate.reason);
        continue;
      }

      // ── 4. 가격이 성립하는가 ─────────────────────────────────
      const pricing = decidePrice({
        landedCostKrw,
        competitorLowKrw: undefined,
      });
      if (!pricing.ok) {
        bump(pricing.reason);
        continue;
      }

      // ── 5. 후보 확정 ─────────────────────────────────────────
      const supplier: Supplier = {
        platform: listing.platform === "domeme" ? "domeme" : "domeggook",
        itemNo,
        title: listing.title,
        url: listing.url,
        unitPriceKrw: unit.unitPriceKrw,
        shippingKrw,
        landedCostKrw,
        moq: unit.minOrderQty ?? 1,
        singleUnitVerified: true,
        imageUrls: [listing.imageUrl, ...(listing.detailImageUrls ?? [])].filter(
          (u): u is string => typeof u === "string" && u.length > 0,
        ),
        sellerId: listing.sellerId,
        returnPolicyText: listing.policyText,
        live: listing.source === "live",
      };

      const ad = computeAdBreakeven({
        priceKrw: pricing.priceKrw,
        netProfitKrw: pricing.netProfitKrw,
      });

      seenSuppliers.add(key);
      candidates.push({
        id: `c_${Date.now().toString(36)}_${candidates.length}`,
        keyword: seed.keyword,
        title: buildTitle(seed.keyword, listing.title),
        category: seed.category,
        supplier,
        priceKrw: pricing.priceKrw,
        netProfitKrw: pricing.netProfitKrw,
        marginPct: pricing.marginPct,
        priceFloorKrw: pricing.floorKrw,
        pricingReason: pricing.reason,
        maxBidKrw: ad.maxBidKrw,
        breakevenCpcKrw: ad.breakevenCpcKrw,
        foundAt: new Date().toISOString(),
      });
    }
  }

  const sortedRejections = Object.fromEntries(
    [...rejections.entries()].sort((a, b) => b[1] - a[1]),
  );

  return {
    candidates,
    run: {
      ranAt: new Date().toISOString(),
      keywordsTried,
      productsSeen,
      candidatesFound: candidates.length,
      rejections: sortedRejections,
      summary: buildSummary(candidates.length, keywordsTried, productsSeen, sortedRejections),
      elapsedMs: Date.now() - startedAt,
    },
  };
}

/**
 * 사람이 읽는 한 줄 — 0개일 때 특히 중요하다.
 * "없습니다"로 끝내지 않고 **무엇이 병목인지** 항상 말한다.
 */
function buildSummary(
  found: number,
  keywordsTried: number,
  productsSeen: number,
  rejections: Record<string, number>,
): string {
  if (found > 0) {
    return `검색어 ${keywordsTried}개에서 상품 ${productsSeen}개를 보고 ${found}개를 찾았습니다.`;
  }
  const top = Object.entries(rejections).slice(0, 2);
  if (!top.length) {
    return `검색어 ${keywordsTried}개를 훑었지만 도매에서 아무것도 못 봤습니다.`;
  }
  const detail = top.map(([why, n]) => `${why} ${n}건`).join(", ");
  return `검색어 ${keywordsTried}개에서 상품 ${productsSeen}개를 봤는데 전부 걸렀습니다 — ${detail}.`;
}
