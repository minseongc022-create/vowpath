/**
 * 효자상품 엔진 — "계속 수익이 많이 나오는 상품"을 실제 입금액으로 판정한다
 *
 * ★ 이 엔진이 다른 엔진과 근본적으로 다른 점:
 *
 * 이 저장소의 다른 수익 엔진(revenue-engine, profit-probability)은 전부
 * **등록 전 예측**이다. 검색량·경쟁강도로 "얼마나 팔릴 것 같은가"를 추정한다.
 * 이 엔진은 반대로 **등록 후 실측**만 쓴다. 입력은 정산 데이터(SettlementRow),
 * 즉 실제로 들어온 돈이다. 추정치는 한 줄도 섞지 않는다.
 *
 * 그래야 하는 이유: 효자상품은 예측으로 정할 수 없다. 예측이 맞았는지
 * 틀렸는지는 팔아봐야 안다. 예측 점수가 높았던 SKU에 광고비를 몰아주면
 * 예측 오차에 돈을 거는 것이고, 실판매가 확인된 SKU에 몰아주면 사실에 거는 것이다.
 *
 * ★ 효자의 정의 — 두 축이 모두 필요하다:
 *   1) 크기: 월 순익 기여가 큰가
 *   2) 지속성: 그게 계속 나오는가 (일회성 스파이크가 아닌가)
 * 크기만 보면 단발성 대박에 예산을 태우고, 지속성만 보면 소액 안정 SKU에
 * 매달린다. 둘을 곱해야 "계속 수익이 많이 나오는 상품"이 나온다.
 *
 * ⚠️ 표본 부족 시 fail-closed:
 * 판매 이력이 적으면 등급을 매기지 않고 `insufficient_data`로 남긴다.
 * 3건 팔린 SKU를 "효자"로 판정해 광고비를 몰아주는 게 가장 비싼 실수다.
 */

import type { SettlementRow } from "../types";

export const WINNER_ENGINE_VERSION = "1.0";

/** 등급 판정에 필요한 최소 판매 건수 — 이 미만은 판정하지 않는다 */
export const MIN_ORDERS_FOR_GRADE = 8;
/** 지속성을 보려면 최소 이만큼의 기간이 필요하다 */
export const MIN_ACTIVE_DAYS_FOR_TREND = 14;

export type WinnerGrade =
  /** 효자 — 기여도 크고 지속적. 광고·재고·시간을 몰아줄 대상 */
  | "hero"
  /** 육성 — 아직 작지만 상승 추세. 다음 효자 후보 */
  | "rising"
  /** 유지 — 꾸준하지만 기여도가 크지 않음 */
  | "steady"
  /** 하락 — 팔리던 게 꺾였다. 원인 규명 필요 */
  | "declining"
  /** 정리 — 순익이 거의 없거나 마이너스. 페널티·CS 리스크만 남음 */
  | "drain"
  /** 표본 부족 — 판정 보류 */
  | "insufficient_data";

export type WinnerSku = {
  productName: string;
  grade: WinnerGrade;
  orders: number;
  activeDays: number;
  /** 실제 정산 기준 총 순익 (예상정산액 - 원가는 알 수 없으므로 정산액 기준) */
  totalNetKrw: number;
  /** 일평균 순익 */
  dailyNetKrw: number;
  /** 30일 환산 순익 */
  monthlyNetKrw: number;
  /** 목표 대비 기여도 % */
  goalSharePct: number;
  /** 최근 절반 vs 이전 절반 순익 변화율 % (지속성·추세) */
  trendPct: number;
  /** 판매일 분산도 0–100 — 높을수록 꾸준함 (일회성 스파이크가 아님) */
  consistencyScore: number;
  /** 크기 × 지속성 종합 점수 0–100 */
  winnerScore: number;
  /** 미정산·불일치 건수 — 많으면 실제 회수가 불확실 */
  unsettledOrders: number;
  discrepancyOrders: number;
  reason: string;
  actions: string[];
};

export type WinnerReport = {
  engineVersion: string;
  analyzedAt: string;
  /** 분석에 쓰인 정산 건수 */
  settlementCount: number;
  windowDays: number;
  goalKrw: number;
  /** 실측 기준 현재 월 순익 (추정 아님) */
  actualMonthlyNetKrw: number;
  goalProgressPct: number;
  skus: WinnerSku[];
  heroes: WinnerSku[];
  drains: WinnerSku[];
  /** 효자 상위 20%가 만드는 순익 비중 — 파레토 실측 */
  paretoTopSharePct: number;
  /** 목표까지 필요한 추가 효자 SKU 수 (현재 효자 평균 기여 기준) */
  heroesNeededForGoal: number;
  brief: string;
  nextActions: string[];
};

// ─────────────────────────────────────────────────────────────
// 집계
// ─────────────────────────────────────────────────────────────

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.max(1, Math.round(ms / 86_400_000));
}

/**
 * 정산액은 실제 입금 예정액이다. actualPayoutKrw가 있으면 그게 진실이고,
 * 없으면 expectedPayoutKrw를 쓴다. 불일치(discrepancy) 건은 별도로 센다 —
 * 회수가 확정되지 않은 돈을 효자 판정 근거로 삼으면 안 되기 때문.
 */
function netOf(row: SettlementRow): number {
  return row.actualPayoutKrw ?? row.expectedPayoutKrw ?? 0;
}

type Bucket = {
  productName: string;
  rows: SettlementRow[];
};

function groupByProduct(rows: SettlementRow[]): Bucket[] {
  const map = new Map<string, SettlementRow[]>();
  for (const r of rows) {
    const key = r.productName?.trim() || "(이름 없음)";
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }
  return [...map.entries()].map(([productName, rs]) => ({ productName, rows: rs }));
}

/**
 * 판매일 분산도 — 며칠에 걸쳐 고르게 팔렸는가.
 * 같은 10건이라도 하루에 몰린 것(일회성)과 10일에 걸친 것(지속)은 다르다.
 */
function consistency(rows: SettlementRow[], activeDays: number): number {
  const uniqueDays = new Set(rows.map((r) => dayKey(r.orderDate))).size;
  if (activeDays <= 1) return 0;
  // 판매가 발생한 날 비율. 매일 팔리면 100.
  return Math.min(100, Math.round((uniqueDays / activeDays) * 100));
}

/**
 * 추세 — 기간을 반으로 갈라 후반이 전반보다 나은가.
 * 효자의 조건은 "계속"이므로 꺾이는 SKU는 효자에서 뺀다.
 */
function trend(rows: SettlementRow[]): number {
  if (rows.length < 4) return 0;
  const sorted = [...rows].sort(
    (a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime(),
  );
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid).reduce((s, r) => s + netOf(r), 0);
  const secondHalf = sorted.slice(mid).reduce((s, r) => s + netOf(r), 0);
  if (firstHalf <= 0) return secondHalf > 0 ? 100 : 0;
  return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}

// ─────────────────────────────────────────────────────────────
// 등급 판정
// ─────────────────────────────────────────────────────────────

function gradeOf(input: {
  orders: number;
  activeDays: number;
  monthlyNetKrw: number;
  goalKrw: number;
  trendPct: number;
  consistencyScore: number;
}): WinnerGrade {
  // 표본이 부족하면 판정하지 않는다 — 3건 팔린 SKU에 예산을 몰아주는 게
  // 가장 비싼 실수다.
  if (input.orders < MIN_ORDERS_FOR_GRADE || input.activeDays < MIN_ACTIVE_DAYS_FOR_TREND) {
    return "insufficient_data";
  }

  if (input.monthlyNetKrw <= 0) return "drain";

  const sharePct = (input.monthlyNetKrw / Math.max(1, input.goalKrw)) * 100;

  // 효자: 목표의 5% 이상을 혼자 만들면서 꺾이지 않고 꾸준한 SKU.
  // 목표 1,000만원이면 월 50만원 이상 기여.
  if (sharePct >= 5 && input.trendPct > -20 && input.consistencyScore >= 40) return "hero";

  // 하락: 후반이 전반보다 30% 넘게 꺾였다 — 크기와 무관하게 개입 대상
  if (input.trendPct <= -30) return "declining";

  // 육성: 아직 작지만 뚜렷한 상승세
  if (input.trendPct >= 25) return "rising";

  // 기여가 목표의 1% 미만이면 관리 비용이 수익보다 크다
  if (sharePct < 1) return "drain";

  return "steady";
}

function actionsFor(g: WinnerGrade, sku: Omit<WinnerSku, "grade" | "reason" | "actions">): string[] {
  switch (g) {
    case "hero":
      return [
        "광고 예산 최우선 배분 — 실판매가 검증된 SKU라 예측 오차 없이 태울 수 있다",
        "공급처 재고·출고율 주간 점검 — 효자가 품절되면 목표가 통째로 흔들린다",
        "동일 공급처의 연관 상품으로 라인 확장 (검증된 수요를 옆으로 넓히기)",
      ];
    case "rising":
      return [
        `상승세 +${sku.trendPct}% — 광고 소액 증액으로 효자 전환 시도`,
        "상세·썸네일 개선으로 전환율 밀어올리기",
      ];
    case "steady":
      return [
        "현상 유지 — 추가 예산보다 가격·구성 실험으로 단위 순익 개선",
      ];
    case "declining":
      return [
        `순익 ${sku.trendPct}% 하락 — 경쟁사 최저가 진입 또는 대표아이템 상실 여부 확인`,
        "카탈로그 위치 점검 (대표 미선정이면 광고까지 노출 제한된다)",
        "회복 안 되면 광고 중단 후 정리 대상으로 이동",
      ];
    case "drain":
      return [
        "광고 즉시 중단 — 순익이 관리비용을 못 넘는다",
        "판매 중지 검토: 반품·CS 발생 시 페널티만 쌓이고 인센티브 자격을 위협한다",
      ];
    default:
      return [
        `판매 ${sku.orders}건 · ${sku.activeDays}일 — 표본 부족으로 판정 보류 (최소 ${MIN_ORDERS_FOR_GRADE}건 / ${MIN_ACTIVE_DAYS_FOR_TREND}일)`,
      ];
  }
}

function reasonFor(g: WinnerGrade, sku: Omit<WinnerSku, "grade" | "reason" | "actions">): string {
  const money = `월 ${sku.monthlyNetKrw.toLocaleString()}원 (목표의 ${sku.goalSharePct}%)`;
  switch (g) {
    case "hero":
      return `효자 — ${money} · 추세 ${sku.trendPct >= 0 ? "+" : ""}${sku.trendPct}% · 꾸준함 ${sku.consistencyScore}점`;
    case "rising":
      return `육성 — ${money}이지만 추세 +${sku.trendPct}%로 상승 중`;
    case "steady":
      return `유지 — ${money} · 안정적이나 기여도 제한적`;
    case "declining":
      return `하락 — ${money} · 후반 순익이 ${sku.trendPct}% 꺾였다`;
    case "drain":
      return sku.monthlyNetKrw <= 0
        ? `정리 — 순익 ${sku.monthlyNetKrw.toLocaleString()}원 (적자)`
        : `정리 — ${money}로 관리비용 대비 기여가 낮다`;
    default:
      return `표본 부족 — ${sku.orders}건 / ${sku.activeDays}일`;
  }
}

// ─────────────────────────────────────────────────────────────
// 리포트
// ─────────────────────────────────────────────────────────────

export function analyzeWinnerSkus(input: {
  settlements: SettlementRow[];
  goalKrw: number;
  now?: string;
}): WinnerReport {
  const now = input.now ?? new Date().toISOString();
  const rows = input.settlements.filter((r) => r.orderDate);
  const goalKrw = Math.max(1, input.goalKrw);

  if (!rows.length) {
    return {
      engineVersion: WINNER_ENGINE_VERSION,
      analyzedAt: now,
      settlementCount: 0,
      windowDays: 0,
      goalKrw,
      actualMonthlyNetKrw: 0,
      goalProgressPct: 0,
      skus: [],
      heroes: [],
      drains: [],
      paretoTopSharePct: 0,
      heroesNeededForGoal: 0,
      brief:
        "정산 데이터가 없어 효자상품을 판정할 수 없다. 효자 판정은 예측이 아니라 실제 입금액으로만 한다 — 첫 판매·정산이 쌓이면 자동으로 분석된다.",
      nextActions: [
        "설정 → API 연동으로 토스 주문·정산 동기화",
        "정산 CSV 업로드로 과거 실적 소급 반영 가능",
      ],
    };
  }

  const dates = rows.map((r) => r.orderDate).sort();
  const windowDays = daysBetween(dates[0], dates[dates.length - 1]);

  const skus: WinnerSku[] = groupByProduct(rows).map((bucket) => {
    const rs = bucket.rows;
    const bucketDates = rs.map((r) => r.orderDate).sort();
    const activeDays = daysBetween(bucketDates[0], bucketDates[bucketDates.length - 1]);
    const totalNetKrw = rs.reduce((s, r) => s + netOf(r), 0);
    const dailyNetKrw = Math.round(totalNetKrw / activeDays);
    const monthlyNetKrw = dailyNetKrw * 30;
    const trendPct = trend(rs);
    const consistencyScore = consistency(rs, activeDays);
    const goalSharePct = Math.round((monthlyNetKrw / goalKrw) * 1000) / 10;

    // 크기(목표 기여) × 지속성(추세·꾸준함)
    const sizeScore = Math.min(60, (monthlyNetKrw / goalKrw) * 100 * 6);
    const trendScore = Math.max(0, Math.min(20, 10 + trendPct / 5));
    const steadyScore = (consistencyScore / 100) * 20;
    const winnerScore = Math.round(Math.min(100, sizeScore + trendScore + steadyScore));

    const base = {
      productName: bucket.productName,
      orders: rs.length,
      activeDays,
      totalNetKrw,
      dailyNetKrw,
      monthlyNetKrw,
      goalSharePct,
      trendPct,
      consistencyScore,
      winnerScore,
      unsettledOrders: rs.filter((r) => r.status === "pending").length,
      discrepancyOrders: rs.filter((r) => r.status === "discrepancy").length,
    };

    const grade = gradeOf({
      orders: base.orders,
      activeDays,
      monthlyNetKrw,
      goalKrw,
      trendPct,
      consistencyScore,
    });

    return { ...base, grade, reason: reasonFor(grade, base), actions: actionsFor(grade, base) };
  });

  skus.sort((a, b) => b.monthlyNetKrw - a.monthlyNetKrw);

  const heroes = skus.filter((s) => s.grade === "hero");
  const drains = skus.filter((s) => s.grade === "drain");

  // 실측 월 순익 — 전체 기간 순익을 30일로 환산
  const totalNet = skus.reduce((s, k) => s + k.totalNetKrw, 0);
  const actualMonthlyNetKrw = Math.round((totalNet / windowDays) * 30);
  const goalProgressPct = Math.round((actualMonthlyNetKrw / goalKrw) * 1000) / 10;

  // 파레토 실측 — 상위 20% SKU가 순익의 몇 %를 만드는가
  const topCount = Math.max(1, Math.ceil(skus.length * 0.2));
  const topNet = skus.slice(0, topCount).reduce((s, k) => s + k.monthlyNetKrw, 0);
  const allNet = skus.reduce((s, k) => s + Math.max(0, k.monthlyNetKrw), 0);
  const paretoTopSharePct = allNet > 0 ? Math.round((topNet / allNet) * 100) : 0;

  const gapKrw = Math.max(0, goalKrw - actualMonthlyNetKrw);
  const avgHeroKrw = heroes.length
    ? Math.round(heroes.reduce((s, h) => s + h.monthlyNetKrw, 0) / heroes.length)
    : 0;
  const heroesNeededForGoal = avgHeroKrw > 0 ? Math.ceil(gapKrw / avgHeroKrw) : 0;

  return {
    engineVersion: WINNER_ENGINE_VERSION,
    analyzedAt: now,
    settlementCount: rows.length,
    windowDays,
    goalKrw,
    actualMonthlyNetKrw,
    goalProgressPct,
    skus,
    heroes,
    drains,
    paretoTopSharePct,
    heroesNeededForGoal,
    brief: buildBrief({
      goalKrw,
      actualMonthlyNetKrw,
      goalProgressPct,
      heroes,
      drains,
      skus,
      paretoTopSharePct,
      heroesNeededForGoal,
      avgHeroKrw,
      windowDays,
    }),
    nextActions: buildNextActions({ heroes, drains, skus, heroesNeededForGoal, avgHeroKrw }),
  };
}

function buildBrief(i: {
  goalKrw: number;
  actualMonthlyNetKrw: number;
  goalProgressPct: number;
  heroes: WinnerSku[];
  drains: WinnerSku[];
  skus: WinnerSku[];
  paretoTopSharePct: number;
  heroesNeededForGoal: number;
  avgHeroKrw: number;
  windowDays: number;
}): string {
  const parts = [
    `실측 월 순익 ${i.actualMonthlyNetKrw.toLocaleString()}원 — 목표 ${(i.goalKrw / 10000).toLocaleString()}만원의 ${i.goalProgressPct}% (정산 ${i.windowDays}일 기준, 추정 아님)`,
    `효자 ${i.heroes.length}개 · 정리대상 ${i.drains.length}개 · 판정보류 ${i.skus.filter((s) => s.grade === "insufficient_data").length}개`,
  ];
  if (i.paretoTopSharePct > 0) {
    parts.push(`상위 20% SKU가 순익의 ${i.paretoTopSharePct}%를 만든다`);
  }
  if (i.heroesNeededForGoal > 0 && i.avgHeroKrw > 0) {
    parts.push(
      `목표까지 효자 ${i.heroesNeededForGoal}개 더 필요 (현 효자 평균 월 ${i.avgHeroKrw.toLocaleString()}원 기준)`,
    );
  } else if (i.goalProgressPct >= 100) {
    parts.push("목표 달성 — 효자 SKU 방어(공급처 재고·출고율)가 최우선");
  } else if (!i.heroes.length) {
    parts.push("아직 효자가 없다 — 육성 등급 SKU를 키우는 것이 목표까지의 최단 경로");
  }
  return parts.join(" · ");
}

function buildNextActions(i: {
  heroes: WinnerSku[];
  drains: WinnerSku[];
  skus: WinnerSku[];
  heroesNeededForGoal: number;
  avgHeroKrw: number;
}): string[] {
  const out: string[] = [];
  if (i.heroes.length) {
    out.push(
      `효자 ${i.heroes.length}개(${i.heroes.slice(0, 3).map((h) => h.productName).join(", ")})에 광고·재고 우선 배분`,
    );
    out.push("효자 공급처 출고율 주간 점검 — 품절 한 번이 인센티브와 순위를 같이 무너뜨린다");
  }
  const rising = i.skus.filter((s) => s.grade === "rising");
  if (rising.length) {
    out.push(`육성 ${rising.length}개 소액 증액 — 다음 효자 후보`);
  }
  const declining = i.skus.filter((s) => s.grade === "declining");
  if (declining.length) {
    out.push(`하락 ${declining.length}개 원인 점검 (최저가 진입·대표아이템 상실 여부)`);
  }
  if (i.drains.length) {
    out.push(`정리대상 ${i.drains.length}개 광고 중단 — 페널티·CS 리스크만 남는다`);
  }
  if (i.heroesNeededForGoal > 0) {
    out.push(`신규 소싱 목표: 효자급 SKU ${i.heroesNeededForGoal}개 추가 확보`);
  }
  return out.slice(0, 8);
}
