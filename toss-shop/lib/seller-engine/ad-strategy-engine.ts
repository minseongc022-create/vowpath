/**
 * 토스쇼핑 광고 전략 — 입찰가를 감이 아니라 **손익분기 산수**로 정한다
 *
 * ★ 토스 광고가 다른 플랫폼과 근본적으로 다른 점
 *
 * 광고 클릭 후 7일 내 판매는 **판매수수료(8%)가 0%**가 된다(공식 문서).
 * 다른 플랫폼에는 없는 보너스라, 같은 CPC라도 토스에서 더 많이 남는다.
 *
 * ★ 손익분기를 "수수료 면제분"으로만 잡으면 안 된다
 *
 * 면제분만 세면 2만원 상품의 상한이 32원(=20,000×8%×2%)이 되어 사실상 어떤
 * 광고도 성립하지 않는다. 하지만 광고로 **새로 생긴** 판매는 수수료 절약만
 * 가져오는 게 아니라 그 판매의 **이익 전체**를 가져온다. 그래서 기준은:
 *
 *   손익분기 CPC = (단위 순이익 + 면제되는 수수료) × 전환율 × 증분비율
 *
 * `증분비율`은 "광고 없이는 안 일어났을 판매의 비중"이다. 광고로 팔린 것 중
 * 일부는 어차피 자연 검색으로 팔렸을 물건이고, 그건 이익이 아니라 잠식이다.
 * 그래서 보수적으로 깎아 잡는다.
 *
 * ★ 종전 구현의 문제 (이 재작성의 이유)
 *
 *  · 입찰가가 `80 + 경쟁강도 × 120` 같은 **발명된 숫자**였다. 손익분기와 아무
 *    관계가 없어서, 마진이 안 나오는 상품에도 태연히 광고를 걸었다.
 *  · 예산 등급이 `searchVol > 5000 ? "starter" : "starter"` — 양쪽이 같아
 *    `scale`은 물론 `growth` 밖의 어떤 분기도 실제로 동작하지 않았다.
 *  · 이미 배송 인센티브로 수수료 0%인 옵션에서도 똑같이 광고를 권했다.
 *    그 경우 면제 효과가 중복되지 않아 광고비는 순수 비용이다.
 *
 * ★ 지금의 원칙
 *
 *  1. 손익분기 CPC를 먼저 구하고, 그 **안쪽**에서만 입찰한다.
 *  2. 전환율·증분비율은 실측이 없으면 보수적으로 잡는다 — 낙관적으로 잡으면
 *     손익분기가 부풀어 과다 입찰로 이어진다.
 *  3. 손익분기가 시장 최저 CPC에도 못 미치면 **광고를 걸지 않는다**.
 *     돈 못 버는 상품에 광고를 안 거는 것도 전략이다.
 */

import { TOSS_DEFAULT_SALES_FEE_RATE } from "./toss-policy-engine";
import type { ConsignmentPick, ImportPick, JarvisAdCampaignPlan } from "../types";

export const AD_STRATEGY_VERSION = "2.0";

/**
 * 실측 전환율이 없을 때 쓰는 보수적 가정.
 *
 * 낙관적으로 잡으면 손익분기 CPC가 부풀고, 그대로 입찰하면 실제 전환율에서
 * 건당 손해가 난다. 그래서 낮게 잡는다 — 실제가 더 좋으면 이득일 뿐이다.
 * 등록 후 실제 전환이 쌓이면 그 값으로 대체된다.
 */
const ASSUMED_CVR_PCT = 2;

/**
 * 손익분기의 몇 %까지 입찰할 것인가.
 *
 * 손익분기에 딱 맞춰 입찰하면 이익이 0이고, 전환율이 가정보다 조금만 나빠도
 * 바로 적자다. 여유를 두어 실제로 남게 만든다.
 */
const BID_SAFETY_RATIO = 0.65;

/**
 * 광고로 팔린 것 중 **광고가 없었다면 안 팔렸을** 비중.
 *
 * 광고 유입 판매의 일부는 어차피 자연 검색으로 팔렸을 물건이다. 그 몫은
 * 광고가 만든 이익이 아니라 잠식이므로, 100%를 증분으로 세면 상한이 부풀어
 * 실제로는 손해가 나는 입찰을 하게 된다. 실측(광고 켜기 전후 매출 비교)이
 * 쌓이기 전까지는 보수적으로 깎는다.
 */
const ASSUMED_INCREMENTALITY = 0.7;

/**
 * 이 아래 입찰가는 노출이 안 나올 수 있다고 **경고**하는 선.
 *
 * ⚠️ 토스가 공개한 최저 입찰가가 아니라 우리 판단이다. 그래서 이 선으로
 * 광고를 막지는 않는다 — 실제 시장 CPC는 돌려봐야 알 수 있고, 임의의 선으로
 * 차단하면 될 수도 있는 광고를 못 하게 된다. 대신 경고를 남기고 자동 집행에서만
 * 제외한다. 사람이 보고 판단할 수 있게 숫자는 그대로 보여준다.
 */
const LOW_BID_WARN_KRW = 50;

/** 전환 하나를 판단할 만큼의 클릭이 쌓이려면 최소 이 정도는 필요하다 */
const MIN_DAILY_CLICKS = 5;
/** 한 SKU에 하루 이 이상은 태우지 않는다 — 검증 전 과다 집행 방지 */
const MAX_DAILY_BUDGET_KRW = 20_000;

export function buildAdCampaignPlan(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): JarvisAdCampaignPlan {
  const keyword = pick.keyword;
  const margin = pick.estimatedMarginPct;
  const comp = "competitionIntensity" in pick ? pick.competitionIntensity : 0.5;
  const searchVol = "searchVolume" in pick ? pick.searchVolume : 3000;

  const primaryKeywords = [
    keyword,
    ...(pick.v4?.keywordCluster?.slice(0, 2) ?? []),
    pick.suggestedTitle?.split(/\s+/).slice(0, 2).join(" ") ?? "",
  ].filter(Boolean);

  const longTail = pick.topSellerPlaybook?.tactics
    .filter((t) => t.applied && t.title.includes("롱"))
    .length
    ? [`${keyword} 추천`, `${keyword} 선물`, `${keyword} 가성비`]
    : [`${keyword} ${pick.category === "food" ? "맛집" : "추천"}`];

  const avoidCatalog = pick.catalogStrategy?.mode === "avoid_catalog";

  // ── 입찰가를 손익분기에서 역산한다 ────────────────────────────
  //
  // 배송 인센티브로 이미 수수료가 0%면 광고의 면제 효과가 중복되지 않는다.
  // 그 경우 광고비는 순수 비용이므로 손익분기가 0으로 나오고, 아래에서
  // "광고 보류"로 떨어진다 — 이걸 놓치면 광고를 켤수록 손해가 난다.
  //
  // 인센티브 자격은 공급처가 1등급·당일발송으로 **실증된** 경우에만 인정한다.
  // 추정으로 켜면 "수수료 0%니 광고 불필요"라고 잘못 판단해 노출 기회를 버린다.
  const wholesale = "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const alreadyFeeFree =
    wholesale?.supplierQuality?.verified === true &&
    wholesale.supplierQuality.grade === "excellent" &&
    wholesale.supplierQuality.shipSpeed === "same_day";

  const catalogEntry = "catalogEntry" in pick ? pick.catalogEntry : undefined;
  const unitGrossKrw =
    catalogEntry?.best.netProfitKrw ??
    Math.max(1, Math.round(pick.recommendedPriceKrw * (margin / 100)));

  // 광고로 새로 생긴 판매는 이익 전체를 가져온다. 여기에 토스 특유의
  // 수수료 면제 보너스가 더해진다(이미 0%면 보너스는 없고 이익만 남는다).
  const feeSavedKrw = alreadyFeeFree
    ? 0
    : Math.round(pick.recommendedPriceKrw * TOSS_DEFAULT_SALES_FEE_RATE);
  const valuePerAdSaleKrw = unitGrossKrw + feeSavedKrw;

  const cvr = ASSUMED_CVR_PCT / 100;
  const breakevenCpcKrw = Math.floor(valuePerAdSaleKrw * cvr * ASSUMED_INCREMENTALITY);

  const maxBid = Math.floor(breakevenCpcKrw * BID_SAFETY_RATIO);
  // 경제성이 아예 없는 경우(입찰가가 0원)만 광고를 막는다.
  const canAdvertise = maxBid > 0;
  // 걸 수는 있지만 노출이 안 나올 수 있는 구간 — 경고하고 자동 집행에서 뺀다.
  const lowBidRisk = canAdvertise && maxBid < LOW_BID_WARN_KRW;

  const estimatedCpcKrw = canAdvertise ? maxBid : 0;
  const dailyBudgetKrw = canAdvertise
    ? Math.min(MAX_DAILY_BUDGET_KRW, Math.max(estimatedCpcKrw * MIN_DAILY_CLICKS, 3_000))
    : 0;
  const estimatedClicks = canAdvertise ? Math.floor(dailyBudgetKrw / estimatedCpcKrw) : 0;

  // 목표 순위는 점수를 지어내지 않고, 경쟁 밀도와 광고 여력으로만 가른다.
  const rankTarget = canAdvertise ? Math.round(Math.max(55, Math.min(95, 90 - comp * 30))) : 0;

  const tactics: string[] = [];

  if (!canAdvertise) {
    tactics.push(
      `광고 보류 — 판매 1건이 가져오는 이익이 ${valuePerAdSaleKrw.toLocaleString()}원뿐이라 ` +
        "손익분기 입찰가가 나오지 않습니다. 클릭을 살수록 손해입니다.",
    );
    tactics.push("가격·구성을 올려 단위 마진을 키우거나, 마진이 큰 SKU에 예산을 몰아주세요.");
  } else {
    if (lowBidRisk) {
      tactics.push(
        `⚠️ 입찰 상한이 ${estimatedCpcKrw.toLocaleString()}원으로 낮아 노출이 거의 안 나올 수 있습니다. ` +
          "손해는 안 나지만 데이터도 안 쌓일 수 있으니, 소액으로 며칠 돌려보고 노출이 없으면 접으세요.",
      );
    }
    tactics.push(
      `핵심 키워드 "${keyword}" — 입찰 상한 ${estimatedCpcKrw.toLocaleString()}원 ` +
        `(손익분기 ${breakevenCpcKrw.toLocaleString()}원의 ${Math.round(BID_SAFETY_RATIO * 100)}%)`,
    );
    tactics.push(
      alreadyFeeFree
        ? `판매 1건 가치 ${valuePerAdSaleKrw.toLocaleString()}원 — 배송 인센티브로 이미 수수료 0%라 광고의 면제 보너스는 없습니다. 증분 판매의 이익만으로 계산했습니다.`
        : `판매 1건 가치 ${valuePerAdSaleKrw.toLocaleString()}원 (순이익 ${unitGrossKrw.toLocaleString()}원 + 수수료 면제 ${feeSavedKrw.toLocaleString()}원)`,
    );
    tactics.push(
      `일예산 ${dailyBudgetKrw.toLocaleString()}원 → 하루 약 ${estimatedClicks}클릭. ` +
        `전환율 ${ASSUMED_CVR_PCT}% · 증분비율 ${Math.round(ASSUMED_INCREMENTALITY * 100)}% 가정이므로, ` +
        "실제 전환이 쌓이면 상한을 다시 계산합니다.",
    );
    tactics.push(`롱테일 ${longTail.slice(0, 2).join(", ")} — 경쟁↓ · 전환↑`);
  }

  if (avoidCatalog) {
    tactics.push("Item Winner 회피 — 차별 구성 키워드로 카탈로그 분리 유지");
  } else if (pick.catalogWin?.representativeItemScore != null && pick.catalogWin.representativeItemScore >= 58) {
    tactics.push("대표아이템 선점 — 총액(상품+배송) 최저 유지 + 무료배송");
  }

  if (canAdvertise && mode === "consignment") {
    tactics.push("위탁 — 재고 리스크가 없으므로 신규 SKU 검증에 예산을 먼저 씁니다");
  }

  if (canAdvertise) {
    tactics.push("등록 48h 후 실제 전환율로 손익분기를 다시 계산 → 상한 재조정");
  }

  return {
    engineVersion: AD_STRATEGY_VERSION,
    keyword,
    primaryKeywords: [...new Set(primaryKeywords)].slice(0, 5),
    longTailKeywords: longTail.slice(0, 4),
    dailyBudgetKrw,
    estimatedCpcKrw,
    estimatedDailyClicks: estimatedClicks,
    rankTargetScore: rankTarget,
    pageOneGoal: !canAdvertise
      ? "광고 보류 — 이 마진으로는 입찰이 성립하지 않습니다"
      : rankTarget >= 70
        ? "1페이지 상단 가능 (2~4주)"
        : "1페이지 중하단 (4~6주)",
    itemWinnerAvoidance: avoidCatalog,
    tactics,
    brief: canAdvertise
      ? `광고 설계 — ${keyword} · 입찰 상한 ${estimatedCpcKrw.toLocaleString()}원 · 일 ${dailyBudgetKrw.toLocaleString()}원 · ${avoidCatalog ? "카탈로그 분리" : "대표아이템 경쟁"}`
      : `광고 보류 — ${keyword} · 손익분기 CPC ${breakevenCpcKrw.toLocaleString()}원으로 입찰이 성립하지 않습니다`,
    // 광고가 성립하지 않거나 노출이 안 나올 만큼 입찰가가 낮으면 자동 집행하지 않는다
    autoExecuteReady:
      canAdvertise && !lowBidRisk && margin >= 15 && pick.jarvis?.certified === true,
  };
}
