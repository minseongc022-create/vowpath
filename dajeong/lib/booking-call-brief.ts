import type {
  BookingCallOutcome,
  BookingCallRecord,
  DajeongPlan,
  ReservationTask,
} from "./types";

/**
 * 하루위드가 대신 거는 예약 전화의 "무슨 말을 할지"와 "결과를 어떻게 반영할지".
 *
 * 통화 상대는 실제로 바쁜 가게 사장님이다. 그래서 대본은 짧고, 용건부터 말하고, 사람인 척
 * 하지 않는다 — 첫 문장에서 AI 비서라는 걸 밝힌다. 나중에 알게 되는 것보다 낫고, 대부분은
 * 그래야 오히려 협조적으로 받아준다.
 *
 * 이 파일은 네트워크를 타지 않는 순수 로직만 담는다(테스트 가능해야 하므로). 실제 발신은
 * booking-call.ts에서 한다.
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "9월 12일 토요일" — 전화로 말할 때 요일까지 말해야 서로 착각이 없다. */
export function spokenDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

/** "저녁 7시" — 24시간제로 말하면 전화에서 잘 안 알아듣는다. */
export function spokenTime(time: string): string {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText ?? 0);
  if (!Number.isFinite(hour)) return time;
  const part = hour < 12 ? "오전" : hour < 18 ? "오후" : "저녁";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${part} ${display}시 ${minute}분` : `${part} ${display}시`;
}

/**
 * 카테고리별로 용건이 다르다 — 식당 예약, 케이크 픽업, 공연 관람, 숙박은 물어볼 것이 전부 다르다.
 * 전화 한 통에 다 못 물어보면 사용자가 결국 다시 전화해야 하므로, 그 업종에서 실제로 중요한
 * 것만 골라 넣는다.
 */
function purposeFor(task: ReservationTask): { purpose: string; ask: string; extras: string[] } {
  if (task.kind === "purchase") {
    return {
      purpose: "픽업 주문",
      ask: "그 시간에 찾아갈 수 있는지, 미리 주문해둬야 하는지",
      extras: ["주문 마감 시간", "픽업 가능 시간대", "문구·디자인 요청 가능 여부"],
    };
  }
  if (task.kind === "ticket") {
    return {
      purpose: "관람 예약",
      ask: "그 시간 회차에 자리가 있는지, 현장에서 바로 구매할 수 있는지",
      extras: ["회차 시간", "현장 구매 가능 여부", "1인 요금", "입장 마감 시간"],
    };
  }
  if (task.kind === "lodging") {
    return {
      purpose: "숙박 예약",
      ask: "그날 빈 방이 있는지",
      extras: ["1박 요금", "체크인·체크아웃 시간", "주차 가능 여부", "예약금 필요 여부"],
    };
  }
  if (task.kind === "transport" || task.kind === "rental_car") {
    return {
      purpose: "예약",
      ask: "그 시간에 이용할 수 있는지",
      extras: ["요금", "필요 서류", "취소 조건"],
    };
  }
  return {
    purpose: "예약",
    ask: "그 시간에 자리가 있는지",
    extras: ["1인 예상 금액", "주차 가능 여부", "예약 시간 유지 시간"],
  };
}

export type BookingCallContact = {
  /** 사용자가 공개를 승인한 이름. 승인 안 했으면 비운다. */
  name?: string;
  /** 사용자가 공개를 승인한 연락처. 승인 안 했으면 비운다. */
  phone?: string;
};

/**
 * 전화로 예약을 시도할 수 있는 항목인지. 전화번호가 없으면 애초에 불가능하고,
 * 이미 확정된 항목에 다시 전화를 걸면 중복 예약이 된다.
 */
export function canCallForBooking(task: ReservationTask): boolean {
  if (!task.phoneNumber?.trim()) return false;
  if (["booked", "purchased", "completed", "executing", "cancel_requested", "refunded"].includes(task.status)) return false;
  return true;
}

/** 같은 항목에 전화를 다시 걸어도 되는지. 방금 끊었는데 또 걸거나, 이미 여러 번
 * 시도했는데 계속 거는 건 가게에도 민폐고 통화 요금만 나간다. */
export const CALL_COOLDOWN_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS_PER_TASK = 3;

export type CallGate = { ok: true } | { ok: false; reason: string };

/**
 * 이 항목에 지금 전화를 걸어도 되는지 판단한다. 통화 기록(이 항목에 걸었던 것만)과 현재
 * 시각을 받아서, 진행 중인 통화가 있는지·시도 횟수를 다 썼는지·너무 최근에 끊었는지를 본다.
 */
export function callGateStatus(taskId: string, historyForTask: BookingCallRecord[], now = new Date()): CallGate {
  const attempts = historyForTask.filter((call) => call.taskId === taskId);
  if (attempts.some((call) => call.status === "queued" || call.status === "in_progress")) {
    return { ok: false, reason: "이 항목은 지금 통화 중이야. 끝나면 결과를 알려줄게." };
  }
  if (attempts.length >= MAX_ATTEMPTS_PER_TASK) {
    return { ok: false, reason: `이 항목은 이미 ${MAX_ATTEMPTS_PER_TASK}번 시도했어. 직접 확인해봐야 할 것 같아.` };
  }
  const lastEnded = attempts
    .filter((call) => call.status === "finished" || call.status === "failed")
    .map((call) => new Date(call.endedAt ?? call.updatedAt).getTime())
    .sort((a, b) => b - a)[0];
  if (lastEnded != null) {
    const elapsed = now.getTime() - lastEnded;
    if (elapsed < CALL_COOLDOWN_MS) {
      const minutesLeft = Math.max(1, Math.ceil((CALL_COOLDOWN_MS - elapsed) / 60_000));
      return { ok: false, reason: `방금 이 항목에 전화했어. ${minutesLeft}분 뒤에 다시 걸 수 있어.` };
    }
  }
  return { ok: true };
}

const KST_OFFSET_MINUTES = 9 * 60;

/** 서버가 어느 시간대에서 돌든 한국 시각으로 몇 시인지. 한국은 서머타임이 없어 고정 +9다. */
export function koreaHour(now: Date): number {
  return new Date(now.getTime() + KST_OFFSET_MINUTES * 60_000).getUTCHours();
}

/**
 * 지금 전화를 걸어도 되는 시간인지.
 *
 * 새벽 3시에 가게에 전화가 가면 그건 사용자를 돕는 게 아니라 민폐다. 영업시간 정보가 있으면
 * 그걸 우선 보고, 없으면 보수적으로 오전 10시~오후 8시로 잡는다. 애매하면 안 거는 쪽이다.
 */
export function withinCallableHours(now: Date, phoneHours?: string[]): { ok: boolean; reason?: string } {
  const hour = koreaHour(now);
  if (hour < 10 || hour >= 20) {
    return { ok: false, reason: "지금은 가게에 전화하기 이른/늦은 시간이라 10시~20시 사이에 걸게." };
  }
  // 영업시간 문자열에 "휴무"가 오늘 요일로 걸려 있으면 걸지 않는다. 형식이 제각각이라
  // 확실히 읽히는 경우만 막고, 못 읽으면 시간대 규칙만 적용한다.
  const today = ["일", "월", "화", "수", "목", "금", "토"][new Date(now.getTime() + KST_OFFSET_MINUTES * 60_000).getUTCDay()];
  const closedToday = (phoneHours ?? []).some((line) => line.includes(today) && /휴무|휴무일|정기휴일|closed/i.test(line));
  if (closedToday) return { ok: false, reason: "오늘은 그 가게 휴무일로 나와 있어서 전화하지 않을게." };
  return { ok: true };
}

/**
 * 사용자가 승인 전에 "무슨 말을 할 건지" 그대로 볼 수 있어야 한다. 승인 화면에 이 문장을
 * 띄운다 — 내 이름이 어떻게 불릴지 모르는 채로 남의 가게에 전화가 걸리면 안 된다.
 */
export function callPreviewScript(params: {
  task: ReservationTask;
  plan: DajeongPlan;
  contact: BookingCallContact;
}): string {
  const { task, plan, contact } = params;
  const { purpose, ask } = purposeFor(task);
  const when = `${spokenDate(plan.situation.targetDate)} ${spokenTime(task.time)}`;
  const party = `${plan.situation.partySize}명`;
  const naming = contact.name ? `예약자 이름은 ${contact.name}으로` : "예약자 이름은 알려드릴 수 있고";
  return [
    `안녕하세요, 저는 예약을 도와드리는 AI 비서입니다.`,
    `${when} ${party} ${purpose} 문의드리려고 연락드렸어요.`,
    `${ask} 확인 부탁드립니다.`,
    `가능하시면 ${naming}, 정확한 금액이랑 취소 조건도 여쭤볼게요.`,
  ].join(" ");
}

/**
 * Retell 에이전트에게 넘길 변수들. 대본 자체는 에이전트 프롬프트에 있고, 여기서는 이 통화에만
 * 해당하는 사실만 넘긴다 — 값이 비면 에이전트가 그 부분을 아예 말하지 않도록 빈 문자열로 준다.
 */
export function bookingCallVariables(params: {
  task: ReservationTask;
  plan: DajeongPlan;
  contact: BookingCallContact;
}): Record<string, string> {
  const { task, plan, contact } = params;
  const { purpose, ask, extras } = purposeFor(task);
  const notes: string[] = [];
  if (plan.situation.constraints.length) notes.push(plan.situation.constraints.join(", "));
  if (task.kind === "purchase") notes.push("픽업 시간에 맞춰 준비 가능한지 확인 필요");
  return {
    place_name: task.title,
    purpose,
    primary_question: ask,
    // 그 업종에서 안 물어보면 나중에 다시 전화하게 되는 것들.
    extra_questions: extras.join(", "),
    visit_date: spokenDate(plan.situation.targetDate),
    visit_time: spokenTime(task.time),
    party_size: String(plan.situation.partySize),
    guest_name: contact.name?.trim() ?? "",
    guest_phone: contact.phone?.trim() ?? "",
    special_notes: notes.join(" / "),
    // 예산은 "얼마까지 쓸 수 있다"는 우리 쪽 사정이라 가게에 말하지 않는다. 대신 에이전트가
    // 금액을 물어보고 그대로 받아적게만 한다.
    budget_hint: "",
  };
}

/** 통화 결과를 사용자에게 말해줄 한 문장. 확인 안 된 걸 확인된 것처럼 말하지 않는다. */
export function outcomeMessage(record: BookingCallRecord): string {
  const place = record.placeName;
  switch (record.outcome) {
    case "confirmed":
      return `${place} 예약됐어.${record.confirmedDetail ? ` ${record.confirmedDetail}` : ""}${
        record.quotedAmount ? ` 확인된 금액은 ${record.quotedAmount.toLocaleString("ko-KR")}원이야.` : ""
      }${record.cancellationTerms ? ` 취소 조건은 "${record.cancellationTerms}"래.` : ""}`;
    case "alternative_offered":
      return `${place}는 그 시간이 안 된대. 대신 ${record.offeredAlternative ?? "다른 시간"}은 가능하다고 했어. 그걸로 할까?`;
    case "declined":
      return `${place}는 그날 그 시간에 예약이 어렵대. 다른 곳을 찾아볼까?`;
    case "unreachable":
      return `${place}에 전화했는데 안 받으셔. 이따 다시 걸어볼까?`;
    case "needs_human":
      return `${place}랑 통화는 됐는데, ${record.summary ?? "직접 얘기해야 할 부분이 있대"}. 네가 직접 통화하는 게 좋겠어.`;
    default:
      return `${place} 통화는 끝났는데 결과가 분명하지 않아. 예약됐다고 보긴 어려워서 그대로 뒀어.`;
  }
}

/** 통화 결과가 그 항목을 어떤 상태로 만들어야 하는지. 확정 외에는 절대 완료로 넘기지 않는다. */
export function statusForOutcome(outcome: BookingCallOutcome | undefined, task: ReservationTask): ReservationTask["status"] {
  if (outcome === "confirmed") return task.kind === "purchase" || task.kind === "ticket" ? "purchased" : "booked";
  if (outcome === "alternative_offered") return "alternative_required";
  if (outcome === "declined") return "alternative_required";
  if (outcome === "needs_human") return "phone_required";
  if (outcome === "unreachable") return "phone_required";
  return "phone_required";
}

/** 통화 한 건이 그 항목에 남기는 변화. 실제 반영은 reservation-engine이 한다. */
export type CallTaskPatch = Pick<ReservationTask, "status" | "availability" | "price" | "confirmation" | "proposedChange" | "failureReason">;

/**
 * 통화 결과가 그 항목에 남길 내용을 계산한다.
 *
 * 확정일 때만 확인 기록(confirmation)을 남기고, 그때도 통화에서 실제로 들은 내용만 적는다.
 * 상대가 "아마 될 거예요" 정도로 말한 걸 에이전트가 confirmed로 보고했더라도, 우리가 붙이는
 * 문구는 "통화로 확인"이지 가게가 발급한 예약번호가 아니다 — 그렇게 적어야 나중에 사용자가
 * 이 확인이 어디서 온 건지 알 수 있다.
 */
export function callTaskPatch(task: ReservationTask, record: BookingCallRecord): CallTaskPatch {
  const now = record.endedAt ?? record.updatedAt;
  const confirmed = record.outcome === "confirmed";
  return {
    status: statusForOutcome(record.outcome, task),
    availability: confirmed ? "available" : record.outcome === "declined" ? "unavailable" : task.availability,
    price: confirmed && record.quotedAmount != null
      ? { ...task.price, confirmedTotalAmount: record.quotedAmount, onsiteAmount: record.quotedAmount, confidence: "provider_quote", checkedAt: now }
      : task.price,
    confirmation: confirmed
      ? {
          source: "provider",
          confirmationId: `call_${record.id}`,
          confirmedAt: now,
          details: [record.confirmedDetail, record.cancellationTerms ? `취소 조건: ${record.cancellationTerms}` : ""].filter(Boolean).join(" · ") || "통화로 예약 확인",
        }
      : task.confirmation,
    proposedChange: record.outcome === "alternative_offered" && record.offeredAlternative
      ? { time: record.offeredAlternative, reason: `${record.placeName}에서 제안한 대체 시간`, requiresApproval: true }
      : task.proposedChange,
    failureReason: confirmed ? undefined : record.outcome === "unreachable" ? "전화를 받지 않음" : record.summary ?? task.failureReason,
  };
}
