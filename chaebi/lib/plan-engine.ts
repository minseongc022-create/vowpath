import type {
  CatalogItem,
  NeedKind,
  OccasionKind,
  Plan,
  PlanItem,
  SituationBrief,
  TimelineEntry,
} from "./types";
import { getCatalogItem } from "./catalog";
import { candidatesFor, priceFor, type Candidate } from "./recommend";
import { formatKoreanTime, hoursUntil, minutesToTime, relativeDayLabel, seoulDateISO, timeToMinutes } from "./datetime";

/**
 * 플랜 생성기 — 상황 한 줄에서 "무엇을, 얼마에, 몇 시에"까지.
 *
 * 세 단계다.
 *   1) 예산 배분: 상황에 따라 무게가 다르다. 부모님 생신은 선물 비중이 크고,
 *      데이트는 식당·코스에 몰린다.
 *   2) 항목 선정: 배분된 예산 안에서 후보를 고른다(recommend.ts).
 *   3) 동선 구성: 픽업 → 이동 → 본 자리 → 이후 코스 순으로 시간을 깐다.
 *      "케이크 언제 찾지?"를 사용자가 생각하지 않아도 되게 하는 게 핵심이다.
 */

/** 항목별 예산 비중. 합이 1일 필요는 없다 — 실제로 쓰는 항목만 정규화한다. */
const BUDGET_WEIGHTS: Record<OccasionKind, Partial<Record<NeedKind, number>>> = {
  birthday: { restaurant: 0.4, cake: 0.12, gift: 0.33, flower: 0.1, activity: 0.12, photo: 0.25, transport: 0.06 },
  anniversary: { restaurant: 0.38, gift: 0.32, flower: 0.12, cake: 0.08, activity: 0.14, photo: 0.25, transport: 0.06 },
  proposal: { restaurant: 0.28, flower: 0.14, gift: 0.34, photo: 0.18, activity: 0.1, cake: 0.06, transport: 0.05 },
  parents_day: { restaurant: 0.38, gift: 0.4, flower: 0.12, cake: 0.1, activity: 0.1, photo: 0.2, transport: 0.08 },
  date: { restaurant: 0.52, activity: 0.32, cake: 0.06, gift: 0.1, flower: 0.08, photo: 0.2, transport: 0.06 },
  apology: { flower: 0.22, gift: 0.4, restaurant: 0.36, cake: 0.08, activity: 0.1, photo: 0.15, transport: 0.06 },
  congratulation: { restaurant: 0.4, gift: 0.42, flower: 0.14, cake: 0.1, activity: 0.1, photo: 0.15, transport: 0.06 },
  farewell: { restaurant: 0.55, gift: 0.4, flower: 0.1, cake: 0.08, activity: 0.1, photo: 0.15, transport: 0.06 },
  other: { restaurant: 0.5, gift: 0.4, flower: 0.12, cake: 0.1, activity: 0.15, photo: 0.15, transport: 0.06 },
};

/** 화면·동선에서의 고정 순서 */
const NEED_ORDER: NeedKind[] = ["restaurant", "cake", "flower", "gift", "activity", "photo", "transport"];

export const NEED_LABEL: Record<NeedKind, string> = {
  restaurant: "식당",
  cake: "케이크",
  flower: "꽃",
  gift: "선물",
  activity: "코스",
  photo: "사진",
  transport: "이동",
};

export const NEED_VERB: Record<NeedKind, string> = {
  restaurant: "예약",
  cake: "주문",
  flower: "주문",
  gift: "구매",
  activity: "예약",
  photo: "예약",
  transport: "배차",
};

function allocateBudget(brief: SituationBrief): Record<string, number> {
  const weights = BUDGET_WEIGHTS[brief.occasion];
  const needs = orderNeeds(brief.needs);
  const total = needs.reduce((sum, need) => sum + (weights[need] ?? 0.1), 0);
  const allocation: Record<string, number> = {};
  for (const need of needs) {
    const share = (weights[need] ?? 0.1) / (total || 1);
    allocation[need] = Math.round((brief.budgetKrw * share) / 1000) * 1000;
  }
  return allocation;
}

function orderNeeds(needs: NeedKind[]): NeedKind[] {
  return NEED_ORDER.filter((need) => needs.includes(need));
}

function itemId(need: NeedKind, index: number): string {
  return `it_${need}_${index}`;
}

function reasonLine(candidate: Candidate, brief: SituationBrief, need: NeedKind): string {
  const parts = candidate.reasons.slice(0, 2);
  const base = candidate.item.highlight;
  if (!parts.length) return base;
  void need;
  void brief;
  return `${parts.join(" · ")} — ${base}`;
}

function itemsTotal(items: PlanItem[]): number {
  return items.reduce((sum, item) => sum + (item.status === "skipped" ? 0 : item.priceKrw), 0);
}

/**
 * 자동으로 고를 때는 말한 지역 안에서만 고른다.
 *
 * recommend.ts는 지역에 후보가 적으면 이웃 지역을 뒤에 붙여준다 — 사용자가
 * "다른 곳 보기"에서 직접 넓혀 고를 수 있게 하기 위해서다. 하지만 **AI가
 * 알아서 고르는 자리**에서는 그러면 안 된다. "강남에서"라고 말한 사람의
 * 계획에 성수 식당이 슬쩍 들어가면, 그날 저녁에 지하철을 한 번 더 타는 건
 * 사용자다. 예산이 남아 업그레이드를 할 때도 마찬가지다.
 */
function preferLocal(candidates: Candidate[]): Candidate[] {
  const local = candidates.filter((candidate) => !candidate.nearby);
  return local.length ? local : candidates;
}

/**
 * 총액을 예산 안으로 밀어 넣는다.
 *
 * ★ 왜 항목별 상한이 아니라 총액으로 잡는가
 *
 * 예산을 항목별로 칼같이 나눠 상한을 걸면, 케이크 배정이 3만8천원일 때
 * 4만6천원짜리 동네 케이크집이 후보에서 통째로 빠지고 3만5천원짜리 기프티콘이
 * 올라온다. 사용자가 원한 건 "총 30만원"이지 "케이크는 3만8천원 이하"가 아니다.
 *
 * 그래서 고를 때는 배분을 안내선으로만 쓰고(조금 넘어도 후보), 다 고른 뒤
 * 총액이 넘치면 **가장 많이 초과한 항목부터** 더 싼 걸로 내린다. 사람이
 * 예산을 맞추는 방식과 같다.
 */
function trimToBudget(items: PlanItem[], brief: SituationBrief, now: Date, used: Set<string>): void {
  const budget = brief.budgetKrw;
  const exhausted = new Set<string>();

  for (let guard = 0; guard < 12; guard += 1) {
    const total = itemsTotal(items);
    if (total <= budget) return;

    const target = items
      .filter((item) => item.status !== "skipped" && !exhausted.has(item.id))
      .sort((a, b) => b.priceKrw - b.budgetKrw - (a.priceKrw - a.budgetKrw))[0];
    if (!target) return;

    const exclude = new Set(used);
    exclude.delete(target.catalogId);
    // 상한을 현재 가격으로 두면 "지금보다 싼 것들"만 점수순으로 나온다
    const ranked = candidatesFor({
      need: target.need,
      brief,
      allocated: target.priceKrw,
      now,
      exclude,
    });
    const cheaper = preferLocal(ranked).filter(
      (candidate) => candidate.priceKrw < target.priceKrw,
    );

    if (!cheaper.length) {
      exhausted.add(target.id);
      continue;
    }

    // 한 번에 예산 안으로 들어오는 것 중 점수가 가장 높은 걸 고르고,
    // 그런 게 없으면 가장 싼 것으로 한 계단 내린다.
    const fits = cheaper.filter(
      (candidate) => total - target.priceKrw + candidate.priceKrw <= budget,
    );
    const pick = fits[0] ?? [...cheaper].sort((a, b) => a.priceKrw - b.priceKrw)[0];

    used.delete(target.catalogId);
    used.add(pick.item.id);
    target.catalogId = pick.item.id;
    target.priceKrw = pick.priceKrw;
    target.reason = reasonLine(pick, brief, target.need);
    // 대안 목록은 좁히지 않는다 — 사용자가 직접 넓혀 고를 수 있어야 한다
    target.alternativeIds = ranked
      .filter((candidate) => candidate.item.id !== pick.item.id)
      .slice(0, 5)
      .map((candidate) => candidate.item.id);
  }
}

/**
 * 남은 예산이 크게 남으면 가장 무게가 큰 항목 하나를 올려준다.
 * 사용자가 20만원이라고 했는데 12만원짜리 조합을 내밀면 "성의 없다"고 느낀다.
 */
const MAX_UPGRADES = 2;

/**
 * 예산이 크게 남으면 남은 만큼을 실제로 쓴다.
 *
 * 사용자가 30만원이라고 했는데 18만원짜리 조합을 내밀면 "대충 했다"고
 * 느낀다. 반대로 남은 돈을 아무 데나 쓰면 그게 더 나쁘다 — 여자친구
 * 생일에 남은 예산으로 한정식집을 잡아주는 식이다.
 *
 * 그래서 조건이 둘이다: (1) 더 비싸고 (2) **점수가 실제로 더 높은** 후보만
 * 올린다. 값만 오르고 맞춤도가 떨어지면 올리지 않고 예산을 남긴다.
 */
function upgradePass(
  items: PlanItem[],
  brief: SituationBrief,
  now: Date,
  used: Set<string>,
): void {
  const weights = BUDGET_WEIGHTS[brief.occasion];
  const order = [...items]
    .filter((item) => item.status === "draft" && !item.userPicked)
    .sort((a, b) => (weights[b.need] ?? 0) - (weights[a.need] ?? 0));

  let upgrades = 0;
  for (const target of order) {
    if (upgrades >= MAX_UPGRADES) return;
    const leftover = brief.budgetKrw - itemsTotal(items);
    if (leftover < brief.budgetKrw * 0.15) return;

    const exclude = new Set(used);
    exclude.delete(target.catalogId);
    const ranked = candidatesFor({
      need: target.need,
      brief,
      allocated: target.priceKrw + leftover,
      now,
      exclude,
    });

    const current = ranked.find((candidate) => candidate.item.id === target.catalogId);
    const currentScore = current?.score ?? Number.POSITIVE_INFINITY;
    // 후보 조회는 배정치를 조금 넘겨서도 가져오므로(FLEX), 여기서 남은 예산으로
    // 한 번 더 자른다. 업그레이드가 예산을 넘기면 그건 업그레이드가 아니다.
    const ceiling = target.priceKrw + leftover;
    const better = preferLocal(ranked).filter(
      (candidate) =>
        candidate.priceKrw > target.priceKrw &&
        candidate.priceKrw <= ceiling &&
        candidate.score > currentScore,
    );
    if (!better.length) continue;

    const pick = better[0];
    used.delete(target.catalogId);
    used.add(pick.item.id);
    target.catalogId = pick.item.id;
    target.priceKrw = pick.priceKrw;
    target.budgetKrw = Math.max(target.budgetKrw, target.priceKrw);
    target.reason = reasonLine(pick, brief, target.need);
    target.alternativeIds = ranked
      .filter((candidate) => candidate.item.id !== pick.item.id)
      .slice(0, 5)
      .map((candidate) => candidate.item.id);
    upgrades += 1;
  }
}

/* ─────────────────────────── 동선 ─────────────────────────── */

const DINNER_MINUTES = 120;

/**
 * 동선을 깔면서 각 항목의 예정 시각(scheduledAt)도 같이 확정한다.
 * 항목 배열을 복사해서 돌려주는 이유 — 호출부가 저장소에서 읽어온 객체를
 * 그대로 넘기는 경우가 있어, 여기서 제자리 수정을 하면 아직 저장 안 된
 * 변경이 남의 참조에 새어 나간다.
 */
function buildTimeline(
  source: PlanItem[],
  brief: SituationBrief,
): { timeline: TimelineEntry[]; items: PlanItem[] } {
  const items = source.map((item) => ({ ...item, scheduledAt: null as string | null }));
  const entries: TimelineEntry[] = [];
  const startMinutes = timeToMinutes(brief.startTime);
  const live = items.filter((item) => item.status !== "skipped");

  const main = live.find((item) => item.need === "restaurant");
  const photo = live.find((item) => item.need === "photo");
  const transport = live.find((item) => item.need === "transport");
  const pickups = live.filter((item) => {
    const catalog = getCatalogItem(item.catalogId);
    return catalog?.fulfillment === "pickup";
  });

  // 본 자리에 가까운 것부터 거꾸로 시간을 깐다 (사전 준비는 늦게 할수록 좋다)
  const preItems: PlanItem[] = [];
  if (transport) preItems.push(transport);
  preItems.push(...pickups);
  if (photo) preItems.push(photo);

  let cursor = startMinutes - 40;
  for (const item of preItems) {
    const catalog = getCatalogItem(item.catalogId);
    if (!catalog) continue;
    const at = minutesToTime(Math.max(timeToMinutes("08:00"), cursor));
    item.scheduledAt = at;
    entries.push({
      at,
      title:
        item.need === "transport"
          ? `${catalog.name} 배차`
          : item.need === "photo"
            ? `${catalog.name} 촬영 시작`
            : `${catalog.name} 픽업`,
      detail:
        item.need === "transport"
          ? "지정한 출발지로 차량이 옵니다"
          : item.need === "photo"
            ? `${catalog.addressHint} · 1시간 소요`
            : `${catalog.addressHint} — 미리 결제되어 있어 이름만 말하면 됩니다`,
      itemId: item.id,
      kind: item.need === "transport" ? "move" : "prepare",
    });
    cursor -= 35;
  }

  // 배송 상품은 시간이 아니라 "그날 도착"으로 잡힌다.
  // 두 개가 같은 시각에 겹쳐 보이지 않게 30분씩 벌린다.
  let deliverySlot = timeToMinutes("10:00");
  for (const item of live) {
    const catalog = getCatalogItem(item.catalogId);
    if (!catalog || catalog.fulfillment !== "delivery") continue;
    const at = minutesToTime(deliverySlot);
    item.scheduledAt = at;
    entries.push({
      at,
      title: `${catalog.name} 도착`,
      detail: "당일 오전 도착 예정 — 받으신 뒤 그대로 가져가시면 됩니다",
      itemId: item.id,
      kind: "prepare",
    });
    deliverySlot += 30;
  }

  if (main) {
    const catalog = getCatalogItem(main.catalogId);
    main.scheduledAt = brief.startTime;
    entries.push({
      at: brief.startTime,
      title: `${catalog?.name ?? "식당"} 입장`,
      detail: `${brief.headcount}명 예약 · ${catalog?.addressHint ?? ""}`.trim(),
      itemId: main.id,
      kind: "main",
    });
  }

  // 선물·꽃을 언제 건네는지까지 정해줘야 "다 해준다"가 된다
  const handover = live.filter((item) => item.need === "gift" || item.need === "flower");
  if (handover.length && main) {
    entries.push({
      at: minutesToTime(startMinutes + 45),
      title: "선물 전달 타이밍",
      detail: `메인 요리 나온 뒤가 가장 자연스럽습니다 — ${handover
        .map((item) => getCatalogItem(item.catalogId)?.name ?? "")
        .filter(Boolean)
        .join(", ")}`,
      itemId: handover[0].id,
      kind: "handover",
    });
  }

  const cake = live.find((item) => item.need === "cake");
  if (cake && main) {
    entries.push({
      at: minutesToTime(startMinutes + 80),
      title: "케이크 · 초",
      detail: "식당에 미리 전달해 두면 타이밍 맞춰 내어 줍니다 (예약 시 함께 요청됨)",
      itemId: cake.id,
      kind: "handover",
    });
  }

  const activity = live.find((item) => item.need === "activity");
  if (activity) {
    const catalog = getCatalogItem(activity.catalogId);
    const at = minutesToTime(startMinutes + (main ? DINNER_MINUTES : 0));
    activity.scheduledAt = at;
    entries.push({
      at,
      title: catalog?.name ?? "다음 코스",
      detail: `${catalog?.addressHint ?? ""} · ${catalog?.highlight ?? ""}`.trim(),
      itemId: activity.id,
      kind: "main",
    });
  }

  return { timeline: entries.sort((a, b) => timeToMinutes(a.at) - timeToMinutes(b.at)), items };
}

/* ─────────────────────────── 안내 문구 ─────────────────────────── */

function openingLine(brief: SituationBrief, items: PlanItem[], todayISO: string): string {
  const when = relativeDayLabel(brief.dateISO, todayISO);
  const who = brief.recipientLabel ? `${brief.recipientLabel} ` : "";
  const count = items.filter((item) => item.status !== "skipped").length;
  if (!count) {
    return `${when} ${who}자리를 위해 찾아봤는데, 지금 조건으로는 잡을 수 있는 게 없었어요. 날짜나 예산을 조금만 바꿔볼까요?`;
  }
  return `${when} ${formatKoreanTime(brief.startTime)}, ${who}자리에 필요한 ${count}가지를 ${brief.regionLabel} 기준으로 잡아뒀어요. 확인만 해주시면 제가 전부 처리할게요.`;
}

function immediateSteps(brief: SituationBrief, items: PlanItem[], now: Date): string[] {
  const steps: string[] = [];
  const hoursLeft = hoursUntil(brief.dateISO, brief.startTime, now);

  if (brief.urgency === "today") {
    steps.push(
      `자리까지 ${Math.max(0, Math.floor(hoursLeft))}시간 남았습니다. 지금 확정하면 전부 오늘 안에 됩니다.`,
    );
  }

  const tight = items.find((item) => {
    const catalog = getCatalogItem(item.catalogId);
    return catalog && catalog.leadTimeHours > 0 && hoursLeft - catalog.leadTimeHours < 3;
  });
  if (tight) {
    const catalog = getCatalogItem(tight.catalogId);
    steps.push(`${catalog?.name}은 준비에 ${catalog?.leadTimeHours}시간이 필요해 가장 먼저 요청합니다.`);
  }

  const delivery = items.find((item) => getCatalogItem(item.catalogId)?.fulfillment === "delivery");
  if (delivery) {
    const catalog = getCatalogItem(delivery.catalogId);
    if (catalog?.orderCutoff) {
      steps.push(`${catalog.name}은 ${catalog.orderCutoff} 이전 주문이어야 제때 도착합니다.`);
    }
  }

  if (brief.constraints.length) {
    steps.push(`예약 요청에 이렇게 적어 보냅니다 — ${brief.constraints.join(", ")}.`);
  }

  return steps.slice(0, 3);
}

/* ─────────────────────────── 진입점 ─────────────────────────── */

export type BuildPlanOptions = {
  brief: SituationBrief;
  ownerId: string;
  planId: string;
  now?: Date;
  /** 실제 제휴사 연동이 켜져 있는가 */
  liveFulfillment?: boolean;
};

export function buildPlan(options: BuildPlanOptions): Plan {
  const now = options.now ?? new Date();
  const brief = options.brief;
  const todayISO = seoulDateISO(now);
  const allocation = allocateBudget(brief);
  const needs = orderNeeds(brief.needs);

  const used = new Set<string>();
  const items: PlanItem[] = [];

  needs.forEach((need, index) => {
    const candidates = candidatesFor({
      need,
      brief,
      allocated: allocation[need] ?? 0,
      now,
      exclude: used,
    });
    if (!candidates.length) return;

    const best = preferLocal(candidates)[0];
    used.add(best.item.id);
    items.push({
      id: itemId(need, index),
      need,
      catalogId: best.item.id,
      alternativeIds: candidates.slice(1, 6).map((candidate) => candidate.item.id),
      budgetKrw: allocation[need] ?? best.priceKrw,
      priceKrw: best.priceKrw,
      scheduledAt: null,
      reason: reasonLine(best, brief, need),
      userPicked: false,
      status: "draft",
      statusNote: "확인을 기다리는 중",
      reference: null,
      updatedAt: now.getTime(),
    });
  });

  trimToBudget(items, brief, now, used);
  upgradePass(items, brief, now, used);
  const scheduled = buildTimeline(items, brief);

  return {
    id: options.planId,
    ownerId: options.ownerId,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    confirmedAt: null,
    status: "draft",
    brief,
    items: scheduled.items,
    timeline: scheduled.timeline,
    totalKrw: scheduled.items.reduce((sum, item) => sum + (item.status === "skipped" ? 0 : item.priceKrw), 0),
    openingLine: openingLine(brief, scheduled.items, todayISO),
    immediateSteps: immediateSteps(brief, scheduled.items, now),
    liveFulfillment: options.liveFulfillment ?? false,
  };
}

/** 항목을 바꾸거나 빼면 총액·동선을 다시 계산한다. */
export function recalculatePlan(plan: Plan): Plan {
  const scheduled = buildTimeline(plan.items, plan.brief);
  const totalKrw = scheduled.items.reduce(
    (sum, item) => sum + (item.status === "skipped" ? 0 : item.priceKrw),
    0,
  );
  return {
    ...plan,
    items: scheduled.items,
    timeline: scheduled.timeline,
    totalKrw,
    updatedAt: Date.now(),
  };
}

/** 항목 하나를 다른 카탈로그 항목으로 교체한다. */
export function swapItem(plan: Plan, itemKey: string, catalogId: string): Plan | null {
  const index = plan.items.findIndex((item) => item.id === itemKey);
  if (index < 0) return null;
  const target = plan.items[index];
  const next = getCatalogItem(catalogId);
  if (!next || next.need !== target.need) return null;

  const price = priceFor(next, plan.brief.headcount);
  const alternatives = [
    ...new Set([target.catalogId, ...target.alternativeIds.filter((id) => id !== catalogId)]),
  ].slice(0, 6);

  const items = [...plan.items];
  items[index] = {
    ...target,
    catalogId,
    priceKrw: price,
    alternativeIds: alternatives,
    reason: `직접 고르신 항목입니다 — ${next.highlight}`,
    userPicked: true,
    status: target.status === "skipped" ? "draft" : target.status,
    updatedAt: Date.now(),
  };
  return recalculatePlan({ ...plan, items });
}

/** 항목을 빼거나 되살린다. */
export function toggleItem(plan: Plan, itemKey: string, skipped: boolean): Plan | null {
  const index = plan.items.findIndex((item) => item.id === itemKey);
  if (index < 0) return null;
  const items = [...plan.items];
  items[index] = {
    ...items[index],
    status: skipped ? "skipped" : "draft",
    statusNote: skipped ? "이번엔 빼기로 함" : "확인을 기다리는 중",
    updatedAt: Date.now(),
  };
  return recalculatePlan({ ...plan, items });
}

export type { CatalogItem };
