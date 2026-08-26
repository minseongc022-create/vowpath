/**
 * 월 목표 달성 공식 — 무엇을 얼마나 해야 하는지 역산한다
 *
 * ★ 실측으로 드러난 전략적 결함
 *
 * 지금까지 소싱은 "마진율 15% 이상이면 통과"였다. 마진**율**만 보고
 * 개당 순이익 **금액**을 안 봤다. 그 결과 원가 1,500원짜리를 소싱했고,
 * 그건 마진율 25%를 지켜도 개당 598원이다.
 *
 * 이 숫자로 월 1,000만원을 만들려면 한 달에 16,722개를 팔아야 한다.
 * 위탁판매로 불가능한 수다. 즉 **소싱 단계에서 이미 목표가 불가능해진다.**
 *
 * ★ 실제 공식
 *
 *   월순익 = SKU수 × 30일 × 램프(0.62) × 노출계수 × 일판매량 × 개당순익
 *
 * 노출계수가 지배적이다. 1페이지에 못 들면 0.12로 떨어진다 — 즉 안 팔린다.
 * 그래서 지배 변수는 둘이다:
 *
 *   1. **개당 순이익 금액** — 원가 구간이 정한다
 *   2. **1페이지 노출 확률** — 경쟁강도·경쟁사 리뷰·SEO가 정한다
 *
 * 시뮬레이션 실측(SKU 300개 기준):
 *   개당 3,300원 · 일반 경쟁 →  기대 750만 · 달성확률  3.9%
 *   개당 4,500원 · 일반 경쟁 →  기대1,023만 · 달성확률 52.8%
 *   개당 6,000원 · 일반 경쟁 →  기대1,364만 · 달성확률 95.5%
 *   개당 4,500원 · 틈새+SEO  →  기대1,532만 · 달성확률 99.2%
 *
 * 두 레버 중 하나만 잡아도 90%를 넘고, 둘 다 잡으면 확실해진다.
 * 그래서 자비스는 이 둘을 소싱 기준으로 삼는다.
 */

export const REVENUE_STRATEGY_VERSION = "1.0";

/** 시뮬레이션이 쓰는 램프 계수 — 신규 SKU가 제 속도를 내기까지의 감쇠 */
const RAMP = 0.62;
/** 1페이지에 못 들었을 때의 노출 감쇠 — 사실상 안 팔린다는 뜻 */
const OFF_PAGE1 = 0.12;
/** 위탁 소싱에서 현실적으로 기대할 수 있는 SKU당 일 판매량 */
const REALISTIC_DAILY_UNITS = 1.0;
/** 가격 엔진이 목표로 잡는 순마진 */
const TARGET_NET_MARGIN = 0.25;

export type StrategyTargets = {
  /** 목표 월 순이익 */
  goalKrw: number;
  /** 이 목표를 달성하려면 SKU 하나가 한 달에 벌어야 하는 금액 */
  requiredMonthlyPerSkuKrw: number;
  /** 그러려면 개당 순이익이 얼마여야 하는가 */
  requiredNetProfitPerUnitKrw: number;
  /** 그 순이익이 나오는 도매 원가 하한 */
  requiredLandedCostKrw: number;
  /** 기준으로 삼은 SKU 수 */
  skuTarget: number;
  /** 가정한 1페이지 노출 확률 */
  assumedPage1Prob: number;
};

/**
 * 목표에서 소싱 기준을 역산한다.
 *
 * 노출 확률을 낙관적으로 잡으면 필요한 개당 순이익이 낮게 나오고, 그러면
 * 안 팔릴 상품을 통과시키게 된다. 그래서 **보수적으로** 잡는다 —
 * 틈새를 잘 잡아도 1페이지 확률은 절반 정도로 본다.
 */
export function computeStrategyTargets(input: {
  goalKrw: number;
  skuTarget?: number;
  page1Prob?: number;
}): StrategyTargets {
  const skuTarget = Math.max(1, input.skuTarget ?? 300);
  const page1 = Math.min(0.95, Math.max(0.05, input.page1Prob ?? 0.5));

  // 노출계수: 1페이지에 들면 1, 아니면 0.12. 기대값으로 섞는다.
  const exposure = page1 * 1 + (1 - page1) * OFF_PAGE1;

  // 한 SKU가 한 달에 실제로 팔 것으로 기대되는 개수
  const monthlyUnitsPerSku = REALISTIC_DAILY_UNITS * 30 * RAMP * exposure;

  const requiredMonthlyPerSku = input.goalKrw / skuTarget;
  const requiredNetPerUnit = Math.ceil(requiredMonthlyPerSku / Math.max(0.01, monthlyUnitsPerSku));

  // 개당 순이익 = 판매가 × 순마진, 판매가 = 원가 / (1 - 수수료 - 순마진)
  // → 원가 = 개당순익 × (1 - 수수료 - 순마진) / 순마진
  const divisor = 1 - 0.12 - TARGET_NET_MARGIN; // proposeRetailKrw와 같은 가정
  const requiredLandedCost = Math.ceil((requiredNetPerUnit * divisor) / TARGET_NET_MARGIN);

  return {
    goalKrw: input.goalKrw,
    requiredMonthlyPerSkuKrw: Math.round(requiredMonthlyPerSku),
    requiredNetProfitPerUnitKrw: requiredNetPerUnit,
    requiredLandedCostKrw: requiredLandedCost,
    skuTarget,
    assumedPage1Prob: page1,
  };
}

export type BindingConstraint =
  | "no_supply"
  | "unit_profit_too_low"
  | "not_enough_skus"
  | "not_listed"
  | "no_sales_yet"
  | "on_track";

export type StrategyDiagnosis = {
  constraint: BindingConstraint;
  /** 사장님에게 보여줄 한 줄 */
  headline: string;
  /** 자비스가 이번 사이클에 우선할 행동 */
  priority: string;
  targets: StrategyTargets;
};

/**
 * 지금 무엇이 목표를 막고 있는지 하나만 짚는다.
 *
 * 여러 개를 동시에 늘어놓으면 무엇부터 해야 할지 알 수 없다. 파이프라인
 * 앞쪽부터 확인해 **가장 먼저 끊긴 곳** 하나만 돌려준다 — 뒤쪽을 고쳐도
 * 앞이 막혀 있으면 아무 일도 일어나지 않기 때문이다.
 */
export function diagnoseStrategy(input: {
  goalKrw: number;
  discoveredCount: number;
  publishedSkus: number;
  /** 등록된 SKU들의 개당 순이익 (실측 또는 제안가 기준) */
  netProfitPerUnitKrw: number[];
  /** 실제 정산으로 확인된 월 순이익 — 아직 없으면 0 */
  actualMonthlyNetKrw: number;
  skuTarget?: number;
}): StrategyDiagnosis {
  const targets = computeStrategyTargets({ goalKrw: input.goalKrw, skuTarget: input.skuTarget });
  const need = targets.requiredNetProfitPerUnitKrw;

  const profits = input.netProfitPerUnitKrw.filter((n) => n > 0);
  const median =
    profits.length > 0 ? [...profits].sort((a, b) => a - b)[Math.floor(profits.length / 2)] : 0;

  if (input.discoveredCount === 0) {
    return {
      constraint: "no_supply",
      headline: "도매 공급처에서 상품을 못 가져오고 있습니다",
      priority: "도매꾹 연동 점검 — 발굴이 0이면 그 뒤 단계는 전부 무의미합니다",
      targets,
    };
  }

  // 개당 순이익이 기준에 못 미치면 SKU를 아무리 늘려도 목표에 못 닿는다.
  // 이게 다른 무엇보다 앞선다 — 소싱 단계에서 이미 결판나기 때문이다.
  if (profits.length >= 3 && median < need * 0.7) {
    return {
      constraint: "unit_profit_too_low",
      headline: `개당 순이익이 ${median.toLocaleString()}원 — 목표엔 ${need.toLocaleString()}원이 필요합니다`,
      priority: `원가 ${targets.requiredLandedCostKrw.toLocaleString()}원 이상 구간으로 소싱을 옮깁니다 (저가 상품은 수량으로 못 메웁니다)`,
      targets,
    };
  }

  if (input.publishedSkus === 0) {
    return {
      constraint: "not_listed",
      headline: "등록된 상품이 없습니다",
      priority: "게이트를 통과한 후보를 토스에 등록하는 것이 최우선입니다",
      targets,
    };
  }

  if (input.publishedSkus < targets.skuTarget) {
    const pct = Math.round((input.publishedSkus / targets.skuTarget) * 100);
    return {
      constraint: "not_enough_skus",
      headline: `등록 ${input.publishedSkus}개 / 목표 ${targets.skuTarget}개 (${pct}%)`,
      priority: "소싱·등록 속도를 유지합니다 — SKU 수가 아직 목표 달성 임계점 아래입니다",
      targets,
    };
  }

  if (input.actualMonthlyNetKrw <= 0) {
    return {
      constraint: "no_sales_yet",
      headline: `SKU ${input.publishedSkus}개 확보 — 아직 정산 실적이 없습니다`,
      priority: "노출·전환 최적화 단계 — 안 팔리는 SKU 가격 조정과 상세 보완에 집중합니다",
      targets,
    };
  }

  return {
    constraint: "on_track",
    headline: `실측 월 순이익 ${Math.round(input.actualMonthlyNetKrw / 10000).toLocaleString()}만원`,
    priority: "효자 SKU에 집중하고 부진 SKU를 교체합니다",
    targets,
  };
}
