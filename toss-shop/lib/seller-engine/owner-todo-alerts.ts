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
 * ★ 발주는 이제 자동이다 — 그런데도 알리는 이유
 *
 * 도매꾹 Private API 승인을 받아 발주(setOrder)까지 자동으로 나간다.
 * 그래도 알림이 필요한 경우가 남는다:
 *
 *  · **이머니 부족** — 발주는 성공하려면 사전에 충전해둔 이머니가 있어야
 *    한다. 잔액이 없으면 그 순간부터 **모든** 발주가 막힌다. 이건 시간이
 *    지날수록 나빠지는 게 아니라 즉시 전체가 멈추는 것이라 바로 알린다.
 *  · **발주가 계속 실패**(12시간 넘게 안 나감) — 자동 발주가 매 사이클
 *    시도하는데도 안 됐다면 옵션코드가 안 맞거나 지원 안 하는 플랫폼(수입
 *    판매 등)일 가능성이 높다. 「발주 정보 줘」로 사람이 대신 넣어야 한다.
 *  · 송장 — 공급처가 발송했는데 토스에 송장이 안 올라가면 고객이 배송 조회를
 *    못 하고, 발송기한 미준수로 잡힌다.
 *
 * 반품지는 알리지 않는다. 강제 폴백으로 판매가 계속되므로 "지금 안 하면 손해가
 * 커지는" 일이 아니고, 대시보드와 대화로 충분히 전달된다.
 */

import type { JarvisFulfillmentJob } from "../types";

export const OWNER_TODO_ALERTS_VERSION = "1.0";

export type TodoKind =
  | "need_supplier_order"
  | "need_tracking"
  | "need_emoney"
  /**
   * 등록 전 검수 대기 — 사장님이 최종 확인해야 올라간다.
   *
   * 다른 알림은 "이미 벌어진 일이 방치되고 있다"를 알리는데, 이건 반대로
   * **아직 아무 일도 안 일어났다**를 알린다. 자비스는 초안까지만 만들고
   * 멈춰 있으므로, 사장님이 안 보면 하루치 소싱이 그대로 잠들어 있는다.
   * 손해가 커지는 종류는 아니지만 기회가 그냥 지나간다.
   */
  | "need_review";

export type OwnerTodo = {
  kind: TodoKind;
  count: number;
  /** 문자로 보낼 본문 — 짧게, 뭘 해야 하는지만 */
  message: string;
};

/**
 * SMS 한 건(UCS-2, 한글) 한도는 67자다. 이 문자는 해외발신(Twilio 국제
 * 발송)이라 통신사가 여러 조각을 재조립해 주지 않는다 — 한 건에 다 안
 * 들어가면 링크가 반토막 난 채로 도착한다(실제로 발생했던 사고).
 *
 * ⚠️ 이 값 하나가 진짜 한도다. 가드용으로 따로 더 빡빡한 숫자를 만들면
 * "가드는 통과 못 하는데 실제로는 안전한" 거짓 경보가 생긴다 — 실제로
 * 그 실수를 했다(가드 60자, 실제 한도 67자로 따로 둬서 60~67자 사이의
 * 정상 메시지가 개발 환경에서 예외로 터졌다). 기준은 하나만 둔다.
 */
const SMS_SINGLE_SEGMENT_LIMIT = 67;

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
  extra?: {
    emoneyInsufficientSince?: string;
    /** 검수 대기 중인 인증 초안 수 — 사장님 승인 전까지 등록되지 않는다 */
    pendingReviewCount?: number;
    /** 검수 화면 주소 — 문자에서 바로 열 수 있게 */
    reviewUrl?: string;
  },
): OwnerTodo[] {
  const todos: OwnerTodo[] = [];

  // 검수 대기 — 자비스가 초안까지 만들고 멈춰 있다.
  // 급한 정도는 낮지만 안 보면 하루치 소싱이 그대로 잠든다.
  const pendingReview = extra?.pendingReviewCount ?? 0;
  if (pendingReview > 0) {
    // ⚠️ "문구만 줄이면 된다"고 생각했는데, **URL까지 합친 전체 길이**가
    // 기준이라는 걸 놓쳤다. 그게 이 문제의 진짜 원인이었다.
    //
    // 실측: 문구를 줄인 뒤에도 또 쪼개졌다. 계산해보면 —
    //   문구 40자 + 줄바꿈 1자 + URL(effiroad.com/dashboard/review) 37자 = 78자
    // 한글(UCS-2) SMS 1건 한도는 67자다. 78자는 그 한도를 넘어 두 번째
    // 조각으로 쪼개지는데, **하필 그 경계가 URL 한가운데**였다
    // ("…effiroad.com/dashb" / "oard/review"). 게다가 이 문자는 해외발신
    // (Twilio 국제 발송)이라 통신사가 여러 조각을 하나로 재조립해주지
    // 않는다 — 그래서 사장님 화면에 링크가 반토막 난 채로 각각 도착했다.
    //
    // 그래서 이번엔 **문구+줄바꿈+URL 전체**를 60자 안쪽으로 잡는다
    // (67자 한도에서 여유를 둔다 — 건수가 두 자리에서 세 자리로 늘어나도
    // 안전하게). 문구는 "승인 대기 N건 확인해주세요"까지만 줄였다.
    const message = `[자비스] 승인 대기 ${pendingReview}건 확인해주세요` + (extra?.reviewUrl ? `\n${extra.reviewUrl}` : "");

    // 회귀 방지 — 이 계산을 또 놓치면 같은 사고가 반복된다. 개발 중에는
    // 바로 터뜨려서 알아채게 하고, 운영에서는 조용히 로그만 남긴다
    // (문자 발송 자체를 막으면 더 급한 알림이 하나도 안 나가게 된다).
    if (message.length > SMS_SINGLE_SEGMENT_LIMIT) {
      const msg = `[owner-todo-alerts] need_review 메시지가 ${message.length}자 — 한도(${SMS_SINGLE_SEGMENT_LIMIT}자) 초과, SMS 분할로 링크가 깨질 수 있음`;
      if (process.env.NODE_ENV !== "production") throw new Error(msg);
      console.error(msg);
    }

    todos.push({ kind: "need_review", count: pendingReview, message });
  }

  // 이머니 부족 — 다른 무엇보다 급하다. 이게 걸리면 발주 전체가 멈춘다.
  if (extra?.emoneyInsufficientSince) {
    todos.push({
      kind: "need_emoney",
      count: 1,
      message:
        `[자비스] 도매꾹 이머니 부족 — 발주가 전부 막혔습니다. ` +
        `도매꾹 사이트에서 이머니를 충전해 주세요. 충전되는 즉시 자동으로 다시 발주합니다.`,
    });
  }

  // 자동 발주가 계속 실패해서 오래 묶여 있는 주문 (자비스가 매 사이클 시도하는데도 안 됨)
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
        `[자비스] 발주 안 나간 주문 ${needOrder.length}건 — 자동 발주가 계속 실패하고 있습니다. ` +
        `사이트에서 자비스에게 "발주 정보 줘"라고 하면 직접 넣으실 수 있게 정리해 드립니다.`,
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
 * 지금 보내야 할 알림을 고른다 — 확인할 때까지 되풀이한다.
 *
 * ★ 왜 한 번만 보내면 안 되나
 *
 * 종전엔 종류당 한 번만 보냈다. 그런데 사장님이 그 한 통을 못 보고 넘어가면
 * 그걸로 끝이었다. 발주가 안 나간 채 발송기한을 넘기면 배송 인센티브(수수료
 * 0%)가 통째로 날아가고, 그건 그 달 전 상품의 마진이 깎인다는 뜻이다.
 * 한 통 놓친 대가가 그만큼 크다.
 *
 * ★ 왜 무한정 보내지도 않나
 *
 * 확인했다고 말하면 즉시 멈춘다. 그리고 그 전에도 상한을 둔다 — 답이 없는데
 * 하루 종일 문자가 가면 사장님은 알림을 꺼버리고, 그러면 다음에 진짜 급한
 * 걸 못 보게 된다. 되풀이는 "놓치지 않게" 하는 장치이지 압박 수단이 아니다.
 */

/** 확인 전까지 다시 보내는 간격 */
export const ALERT_REPEAT_MS = 10 * 60 * 1000;
/** 한 건에 대해 이 횟수를 넘겨 보내지 않는다 */
export const ALERT_MAX_REPEATS = 6;

export type AlertState = { kind: string; lastSentAt: string; count: number };

export function pickTodosToSend(
  todos: OwnerTodo[],
  state: AlertState[],
  opts: { ackedAt?: string; nowMs?: number },
): { toSend: OwnerTodo[]; nextState: AlertState[] } {
  const now = opts.nowMs ?? Date.now();
  const ackedMs = opts.ackedAt ? Date.parse(opts.ackedAt) : NaN;
  const byKind = new Map(state.map((s) => [s.kind, s]));
  const toSend: OwnerTodo[] = [];
  const nextState: AlertState[] = [];

  for (const todo of todos) {
    const prev = byKind.get(todo.kind);
    if (!prev) {
      // 처음 생긴 일 — 바로 알린다
      toSend.push(todo);
      nextState.push({ kind: todo.kind, lastSentAt: new Date(now).toISOString(), count: 1 });
      continue;
    }

    const lastMs = Date.parse(prev.lastSentAt);
    // 마지막 발송 뒤에 확인했다고 했으면 되풀이를 멈춘다. 확인이 발송보다
    // 앞이면 그건 이전 건에 대한 확인이므로 멈출 근거가 못 된다.
    const ackedSinceLast = Number.isFinite(ackedMs) && ackedMs >= lastMs;
    const due = Number.isFinite(lastMs) && now - lastMs >= ALERT_REPEAT_MS;
    const underCap = prev.count < ALERT_MAX_REPEATS;

    if (!ackedSinceLast && due && underCap) {
      toSend.push(todo);
      nextState.push({ kind: todo.kind, lastSentAt: new Date(now).toISOString(), count: prev.count + 1 });
    } else {
      nextState.push(prev);
    }
  }

  // 해소된 종류는 상태에서 지운다 — 다시 생기면 처음부터 알린다
  return { toSend, nextState };
}
