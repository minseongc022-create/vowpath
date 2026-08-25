/**
 * 사장님 필수 작업 알림 — 진짜 막힌 것만, 한 번만
 *
 * ★ 알림은 아껴 써야 가치가 있다
 *
 * 자비스는 60초마다 돈다. 막힌 게 있을 때마다 문자를 보내면 하루에 수백 통이
 * 되고, 그러면 사장님은 알림을 끄게 된다. 진짜 급한 게 왔을 때 못 보게 되는 것이다.
 *
 * 그래서 두 겹으로 막는다:
 *  1. **막힌 종류별로 한 번만** 보낸다 (같은 종류가 해소됐다가 다시 생기면 다시 보냄)
 *  2. 자비스가 스스로 처리할 수 있는 건 애초에 알리지 않는다 — 반품지 미등록은
 *     이제 셀러 주소로 강제 폴백되어 등록이 계속되므로 "급한 일"이 아니다.
 *
 * ★ 정말 사람이 해야만 하는 것 둘
 *
 *  · 발주 — 도매매 발주는 오픈 API로 안 된다(대행사 승인 필요). 주문이 들어왔는데
 *    발주가 안 나가면 발송기한을 넘겨 페널티가 쌓이고, 배송 인센티브(수수료 0%)가
 *    통째로 날아간다. 이건 시간이 걸린 문제라 반드시 알려야 한다.
 *  · 송장 — 공급처가 발송했는데 토스에 송장이 안 올라가면 고객이 배송 조회를
 *    못 하고, 역시 발송기한 미준수로 잡힌다.
 *
 * 반품지는 알리지 않는다. 강제 폴백으로 판매가 계속되므로 "지금 안 하면 손해가
 * 커지는" 일이 아니고, 대시보드와 대화로 충분히 전달된다.
 */

import type { JarvisFulfillmentJob } from "../types";

export const OWNER_TODO_ALERTS_VERSION = "1.0";

export type TodoKind = "need_supplier_order" | "need_tracking";

export type OwnerTodo = {
  kind: TodoKind;
  count: number;
  /** 문자로 보낼 본문 — 짧게, 뭘 해야 하는지만 */
  message: string;
};

/** 이 시간이 지나도록 발주가 안 나가면 발송기한이 위험해진다 */
const ORDER_URGENT_AFTER_HOURS = 12;
/** 송장은 더 급하다 — 공급처가 이미 보냈다는 뜻이므로 */
const TRACKING_URGENT_AFTER_HOURS = 6;

function hoursSince(iso: string, now: number): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (now - t) / 3_600_000 : 0;
}

/**
 * 지금 문자로 알려야 할 일을 추린다.
 *
 * 방금 들어온 주문까지 알리면 하루 종일 문자가 온다. 그래서 **시간이 지나도록
 * 처리가 안 된 것**만 고른다 — 그게 실제로 페널티에 가까워지는 것들이다.
 */
export function collectOwnerTodos(
  jobs: JarvisFulfillmentJob[],
  nowMs: number = Date.now(),
): OwnerTodo[] {
  const todos: OwnerTodo[] = [];

  // 발주가 아직 안 나간 주문 (자비스가 발주 정보는 다 준비해둔 상태)
  const needOrder = jobs.filter(
    (j) =>
      (j.status === "detected" || j.status === "toss_preparing" || j.status === "wholesale_ready") &&
      hoursSince(j.createdAt, nowMs) >= ORDER_URGENT_AFTER_HOURS,
  );
  if (needOrder.length > 0) {
    todos.push({
      kind: "need_supplier_order",
      count: needOrder.length,
      message:
        `[자비스] 발주 안 나간 주문 ${needOrder.length}건 — 발송기한이 위험합니다. ` +
        `사이트에서 자비스에게 "발주 정보 줘"라고 하면 바로 알려드립니다.`,
    });
  }

  // 발주는 됐는데 송장이 안 들어온 주문
  const needTracking = jobs.filter(
    (j) =>
      j.status === "wholesale_ordered" &&
      !j.pendingTrackingNumber &&
      hoursSince(j.wholesaleOrderedAt ?? j.createdAt, nowMs) >= TRACKING_URGENT_AFTER_HOURS,
  );
  if (needTracking.length > 0) {
    todos.push({
      kind: "need_tracking",
      count: needTracking.length,
      message:
        `[자비스] 송장 대기 ${needTracking.length}건 — 공급처 송장 나왔으면 ` +
        `자비스에게 "1234567890 CJ대한통운" 처럼 보내주시면 토스 등록까지 제가 합니다.`,
    });
  }

  return todos;
}

/**
 * 이미 보낸 알림인지 판별한다.
 *
 * 같은 종류가 계속 걸려 있으면 다시 보내지 않는다. 해소됐다가(그 종류의 할 일이
 * 0이 됨) 다시 생기면 그때는 새 상황이므로 다시 보낸다 — 그래야 "아까 그거"와
 * "새로 생긴 거"를 구분할 수 있다.
 */
export function pickUnsentTodos(
  todos: OwnerTodo[],
  alreadySent: TodoKind[],
): { toSend: OwnerTodo[]; nextSent: TodoKind[] } {
  const sent = new Set(alreadySent);
  const activeKinds = new Set(todos.map((t) => t.kind));

  const toSend = todos.filter((t) => !sent.has(t.kind));
  // 지금 없는 종류는 기록에서 지운다 — 다음에 다시 생기면 알림이 나가게
  const nextSent = [...activeKinds];

  return { toSend, nextSent };
}
