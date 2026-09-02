import type { CatalogItem, ItemStatus, Plan, PlanItem } from "./types";
import { getCatalogItem } from "./catalog";
import { priceFor } from "./recommend";
import { recalculatePlan } from "./plan-engine";
import { seoulEpoch } from "./datetime";

/**
 * 실행 계층 — "AI가 대신 예약·구매한다"가 실제로 일어나는 자리.
 *
 * ★ 이 파일이 이 앱에서 제일 중요한 경계다
 *
 * 판단(무엇이 필요한가)은 이제 누구나 LLM으로 산다. 진짜 해자는 실행이다 —
 * 예약을 실제로 확정하고, 결제하고, 막히면 대신 다른 곳을 잡는 것. 그래서
 * 실행을 인터페이스 하나로 못 박아 두고, 제휴사 API가 붙는 자리를 명확히 남긴다.
 *
 * 지금 기본값은 SimulatedConnector다. 실제 예약을 걸지 않는다. 화면에도
 * 그렇게 밝힌다(plan.liveFulfillment === false). 캐치테이블·네이버예약·
 * 카카오 선물하기 같은 제휴가 붙으면 여기에 커넥터를 하나 더 등록하고
 * CHAEBI_LIVE_PARTNERS=1을 켜면 위쪽 코드는 한 줄도 안 바뀐다.
 *
 * ★ 왜 상태를 시각 함수로 계산하는가
 *
 * 서버리스에는 상주 프로세스가 없다. 크론으로 상태를 밀어 올리면 크론이
 * 죽는 순간 진행이 멈춘다. 그래서 상태를 저장하는 대신 **(확정 시각, 지금)
 * 으로부터 계산**한다. 몇 번을 읽어도 같은 답이 나오고(멱등), 배포가 바뀌어도
 * 이어진다.
 */

export type FulfillmentStage = {
  /** 이 상태가 되는 시각 (epoch ms) */
  at: number;
  status: ItemStatus;
  note: string;
};

export interface PartnerConnector {
  readonly id: string;
  /** 실제 예약을 거는 커넥터인가 */
  readonly live: boolean;
  /** 예약번호 발급 */
  reference(plan: Plan, item: PlanItem): string;
  /** 확정 이후의 상태 변화 계획 */
  stages(plan: Plan, item: PlanItem, catalog: CatalogItem): FulfillmentStage[];
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function referenceCode(seed: string): string {
  const value = hash(seed).toString(36).toUpperCase().padStart(6, "0");
  return `CB-${value.slice(0, 6)}`;
}

/** 자리(식사·액티비티)가 시작되는 시각 */
function eventEpoch(plan: Plan, item: PlanItem): number {
  return seoulEpoch(plan.brief.dateISO, item.scheduledAt ?? plan.brief.startTime);
}

/**
 * 한 계획에서 "원래 자리가 막히는" 항목은 최대 하나.
 *
 * 이게 이 앱의 존재 이유를 가장 잘 보여주는 순간이라 일부러 흐름에 남겼다 —
 * 보통 앱이라면 사용자에게 "예약이 취소됐습니다" 알림 하나 던지고 끝이다.
 * 여기서는 같은 조건의 대안을 자동으로 다시 잡고 결과만 알린다.
 */
function reassignedItemId(plan: Plan): string | null {
  const eligible = plan.items.filter((item) => {
    if (item.status === "skipped") return false;
    if (!item.alternativeIds.length) return false;
    const catalog = getCatalogItem(item.catalogId);
    return catalog?.fulfillment === "reserve" || catalog?.fulfillment === "pickup";
  });
  if (!eligible.length) return null;
  const hit = eligible.find((item) => hash(`${plan.id}:${item.id}`) % 6 === 1);
  return hit?.id ?? null;
}

export class SimulatedConnector implements PartnerConnector {
  readonly id = "simulated";
  readonly live = false;

  reference(plan: Plan, item: PlanItem): string {
    return referenceCode(`${plan.id}:${item.id}`);
  }

  stages(plan: Plan, item: PlanItem, catalog: CatalogItem): FulfillmentStage[] {
    // 항목마다 조금씩 늦게 출발시킨다 — 넷이 동시에 같은 상태로 움직이면
    // "그냥 타이머 돌린 화면"으로 보인다. 실제로도 순서대로 요청한다.
    const index = Math.max(0, plan.items.findIndex((entry) => entry.id === item.id));
    const start = (plan.confirmedAt ?? plan.updatedAt) + index * 2000;
    const reassigned = reassignedItemId(plan) === item.id;

    if (catalog.fulfillment === "instant") {
      return [
        { at: start, status: "requested", note: "결제와 전송을 진행합니다" },
        { at: start + 3 * SECOND, status: "done", note: "전송 완료" },
      ];
    }

    if (catalog.fulfillment === "delivery") {
      // 주문한 시점부터 리드타임이 지나야 도착한다. 동선에 적힌 "오전 10시"는
      // 예정 표기일 뿐이라, 그보다 이르게 도착했다고 표시하면 거짓말이 된다.
      const nominal = seoulEpoch(plan.brief.dateISO, item.scheduledAt ?? "10:00");
      const earliest = start + catalog.leadTimeHours * 60 * MINUTE;
      const eventStart = seoulEpoch(plan.brief.dateISO, plan.brief.startTime);
      const arrival = Math.min(eventStart, Math.max(nominal, earliest));
      const transit = Math.max(start + 45 * SECOND, arrival - catalog.leadTimeHours * 60 * MINUTE);
      return [
        { at: start, status: "requested", note: "주문을 넣는 중입니다" },
        { at: start + 6 * SECOND, status: "confirmed", note: "주문 확정 · 결제 완료" },
        { at: transit, status: "in_transit", note: "배송이 시작됐습니다" },
        { at: arrival, status: "done", note: "도착 완료" },
      ];
    }

    if (catalog.fulfillment === "pickup") {
      const pickupAt = eventEpoch(plan, item);
      const base: FulfillmentStage[] = reassigned
        ? [
            { at: start, status: "requested", note: "주문을 넣는 중입니다" },
            { at: start + 3 * SECOND, status: "pending", note: "매장에서 재고를 확인 중입니다" },
            {
              at: start + 8 * SECOND,
              status: "reassigned",
              note: "원래 매장이 당일 마감이라 같은 조건의 다른 곳으로 옮겼습니다",
            },
            { at: start + 13 * SECOND, status: "confirmed", note: "주문 확정" },
          ]
        : [
            { at: start, status: "requested", note: "주문을 넣는 중입니다" },
            { at: start + 3 * SECOND, status: "pending", note: "매장에서 확인 중입니다" },
            { at: start + 8 * SECOND, status: "confirmed", note: "주문 확정" },
          ];
      return [
        ...base,
        { at: pickupAt - 20 * MINUTE, status: "ready", note: "픽업 준비가 끝났습니다" },
        { at: pickupAt + 30 * MINUTE, status: "done", note: "픽업 완료" },
      ];
    }

    // reserve — 식당·액티비티·촬영
    const seatAt = eventEpoch(plan, item);
    const base: FulfillmentStage[] = reassigned
      ? [
          { at: start, status: "requested", note: "예약을 요청했습니다" },
          { at: start + 4 * SECOND, status: "pending", note: "매장에서 자리를 확인 중입니다" },
          {
            at: start + 9 * SECOND,
            status: "reassigned",
            note: "원하신 시간이 마감돼 같은 조건의 다른 곳으로 다시 잡았습니다",
          },
          { at: start + 14 * SECOND, status: "confirmed", note: "예약 확정" },
        ]
      : [
          { at: start, status: "requested", note: "예약을 요청했습니다" },
          { at: start + 4 * SECOND, status: "pending", note: "매장에서 확인 중입니다" },
          { at: start + 9 * SECOND, status: "confirmed", note: "예약 확정" },
        ];
    return [...base, { at: seatAt + 120 * MINUTE, status: "done", note: "이용 완료" }];
  }
}

let connector: PartnerConnector = new SimulatedConnector();

/** 실제 제휴 커넥터가 생기면 부팅 시 여기에 꽂는다. */
export function registerConnector(next: PartnerConnector): void {
  connector = next;
}

export function activeConnector(): PartnerConnector {
  return connector;
}

export function isLiveFulfillment(): boolean {
  return connector.live && process.env.CHAEBI_LIVE_PARTNERS === "1";
}

/**
 * 자리가 막혔을 때 대신 잡을 곳.
 *
 * ★ 대신 잡아주는 것과 마음대로 쓰는 것은 다르다
 *
 * 대안 목록은 점수순이라 그냥 첫 번째를 집으면 더 비싼 곳이 걸리기 쉽다.
 * 그러면 사용자가 30만원이라고 말한 계획이 본인도 모르는 사이 33만원이 된다.
 * "대신 처리해주는" 앱이 예산을 말없이 넘기면, 그다음부터는 아무것도 못 맡긴다.
 *
 * 그래서 **총액이 예산 안에 남는 후보 중 가장 좋은 것**을 고르고, 그런 게
 * 하나도 없을 때만 가장 싼 것으로 가면서 넘겼다고 밝힌다.
 */
function pickReplacement(
  plan: Plan,
  item: PlanItem,
): { item: CatalogItem; priceKrw: number; overBudget: boolean } | null {
  const priced = item.alternativeIds
    .map((id) => getCatalogItem(id))
    .filter((candidate): candidate is CatalogItem => Boolean(candidate))
    .map((candidate) => ({
      item: candidate,
      priceKrw: priceFor(candidate, plan.brief.headcount),
    }));
  if (!priced.length) return null;

  const othersTotal = plan.items.reduce(
    (sum, entry) =>
      entry.status === "skipped" || entry.id === item.id ? sum : sum + entry.priceKrw,
    0,
  );
  const room = plan.brief.budgetKrw - othersTotal;

  const withinBudget = priced.find((candidate) => candidate.priceKrw <= room);
  if (withinBudget) return { ...withinBudget, overBudget: false };

  const cheapest = [...priced].sort((a, b) => a.priceKrw - b.priceKrw)[0];
  return { ...cheapest, overBudget: cheapest.priceKrw > room };
}

/** 지금 시점의 상태를 무대(stage) 목록에서 골라낸다. */
function stageAt(stages: FulfillmentStage[], now: number): FulfillmentStage {
  let current = stages[0];
  for (const stage of stages) {
    if (stage.at <= now) current = stage;
  }
  return current;
}

/**
 * 확정된 계획의 현재 상태를 계산한다. 읽을 때마다 호출해도 같은 결과가 나온다.
 * 상태가 바뀐 게 있으면 changed=true — 호출부가 그때만 저장하면 된다.
 */
export function advancePlan(plan: Plan, now: number = Date.now()): { plan: Plan; changed: boolean } {
  if (plan.status !== "confirmed" && plan.status !== "running") return { plan, changed: false };
  if (!plan.confirmedAt) return { plan, changed: false };

  let changed = false;
  let swapped = false;

  const items = plan.items.map((item): PlanItem => {
    if (item.status === "skipped" || item.status === "failed") return item;
    const catalog = getCatalogItem(item.catalogId);
    if (!catalog) return item;

    const stages = connector.stages(plan, item, catalog);
    const stage = stageAt(stages, now);

    // 대안으로 교체되는 순간 — 실제로 다른 업체로 바꾸고 금액을 다시 계산한다.
    // 교체는 딱 한 번만 일어난다(replacedCatalogId가 표식). 그 뒤에는 다음
    // 단계(확정)가 올 때까지 "교체됨" 상태를 그대로 보여준다.
    if (stage.status === "reassigned") {
      if (item.replacedCatalogId) return item;
      const replacement = pickReplacement(plan, item);
      if (!replacement) return item;

      changed = true;
      swapped = true;
      return {
        ...item,
        replacedCatalogId: item.catalogId,
        catalogId: replacement.item.id,
        priceKrw: replacement.priceKrw,
        alternativeIds: item.alternativeIds.filter((id) => id !== replacement.item.id),
        status: "reassigned",
        statusNote: replacement.overBudget
          ? `${stage.note} → ${replacement.item.name} (남은 후보가 이것뿐이라 예산을 조금 넘습니다)`
          : `${stage.note} → ${replacement.item.name}`,
        reference: connector.reference(plan, item),
        updatedAt: now,
      };
    }

    if (stage.status === item.status && item.statusNote === stage.note) return item;

    changed = true;
    return {
      ...item,
      status: stage.status,
      statusNote: stage.note,
      reference: item.reference ?? connector.reference(plan, item),
      updatedAt: now,
    };
  });

  if (!changed) return { plan, changed: false };

  const live = items.filter((item) => item.status !== "skipped");
  const allDone = live.length > 0 && live.every((item) => item.status === "done");
  const anyRunning = live.some(
    (item) => item.status === "requested" || item.status === "pending",
  );

  const next: Plan = {
    ...plan,
    items,
    status: allDone ? "completed" : anyRunning ? "running" : "confirmed",
    updatedAt: now,
  };
  // 업체가 바뀌면 총액과 동선이 같이 움직인다
  return { plan: swapped ? recalculatePlan(next) : next, changed: true };
}

/** "이대로 준비해주세요" — 실행을 시작한다. */
export function confirmPlan(plan: Plan, now: number = Date.now()): Plan {
  const items = plan.items.map((item): PlanItem => {
    if (item.status === "skipped") return item;
    return {
      ...item,
      status: "requested",
      statusNote: "요청을 보내는 중입니다",
      reference: connector.reference(plan, item),
      updatedAt: now,
    };
  });
  return {
    ...plan,
    items,
    status: "running",
    confirmedAt: now,
    updatedAt: now,
    liveFulfillment: isLiveFulfillment(),
  };
}

export function cancelPlan(plan: Plan, now: number = Date.now()): Plan {
  return {
    ...plan,
    status: "cancelled",
    items: plan.items.map((item) =>
      item.status === "skipped"
        ? item
        : { ...item, status: "skipped", statusNote: "취소됨", updatedAt: now },
    ),
    updatedAt: now,
  };
}

/**
 * 남은 시간 안에 이 항목이 아직 가능한가 — 확정 버튼을 누르기 전 마지막 점검.
 *
 * ★ 기준 시각은 반드시 "자리 시작 시각"이다
 *
 * 항목마다 붙은 예정 시각(scheduledAt)은 동선을 보여주기 위한 것이지 마감이
 * 아니다. 배송 선물의 "오전 10시 도착"을 마감으로 삼으면, 계획을 만든 지
 * 1초만 지나도 리드타임 24시간짜리가 곧바로 불가능해진다 — 방금 가능하다고
 * 보여준 걸 확정 버튼에서 거절하는 앱이 된다. 후보를 고를 때(recommend.ts의
 * isFeasible)와 **같은 기준**을 써야 화면과 결과가 어긋나지 않는다.
 */
export function stillFeasible(plan: Plan, item: PlanItem, now: number = Date.now()): boolean {
  const catalog = getCatalogItem(item.catalogId);
  if (!catalog) return false;
  const eventStart = seoulEpoch(plan.brief.dateISO, plan.brief.startTime);
  return eventStart - now >= catalog.leadTimeHours * 60 * MINUTE;
}
