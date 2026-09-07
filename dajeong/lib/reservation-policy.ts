import type { DajeongPlan, ReservationTask } from "./types";
import type {
  ConstraintStrength,
  ReservationContact,
  ReservationGoal,
  StructuredReservationResult,
} from "./reservation-ops-types";

export const RESERVATION_TARGET_SECONDS = 180;
export const RESERVATION_ABSOLUTE_MAX_SECONDS = 240;

export function koreanPhoneToE164(value: string): string {
  const normalized = value.trim().replace(/[^+0-9]/g, "");
  if (/^\+82\d{8,11}$/.test(normalized)) return normalized;
  if (/^0\d{8,10}$/.test(normalized)) return `+82${normalized.slice(1)}`;
  throw new Error("INVALID_KOREAN_PHONE_NUMBER");
}

function minutes(value?: string): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function constraintStrength(text: string): ConstraintStrength {
  if (/무조건|꼭|정확히|절대|아니면\s*(싫|안)/.test(text)) return "HARD";
  if (/쯤|정도|전후|상관없|괜찮|가능하면/.test(text)) return "FLEXIBLE";
  return "PREFERRED";
}

function requestedSeat(plan: DajeongPlan): { value: string; strength: ConstraintStrength; note: string } | null {
  const statements = [...plan.situation.preferences, ...plan.situation.constraints, ...(plan.conversation ?? []).filter((message) => message.role === "user").map((message) => message.text)];
  const statement = [...statements].reverse().find((value) => /창가|홀|룸|테라스|바\s*좌석|좌석/.test(value));
  if (!statement) return null;
  const value = /창가/.test(statement) ? "창가" : /룸/.test(statement) ? "룸" : /테라스/.test(statement) ? "테라스" : /바\s*좌석/.test(statement) ? "바 좌석" : "요청 좌석";
  return { value, strength: constraintStrength(statement), note: statement };
}

export function buildReservationGoal(plan: DajeongPlan, task: ReservationTask, contact: ReservationContact): ReservationGoal {
  const item = plan.items.find((entry) => entry.id === task.itemId);
  if (!item) throw new Error("RESERVATION_ITEM_NOT_FOUND");
  if (!task.phoneNumber) throw new Error("VENUE_PHONE_MISSING");
  const seat = requestedSeat(plan);
  const constraints: ReservationGoal["constraints"] = [
    { field: "date", value: plan.situation.targetDate, strength: "HARD" },
    { field: "partySize", value: plan.situation.partySize, strength: "HARD" },
    { field: "reservationName", value: contact.name, strength: "HARD" },
    {
      field: "time",
      value: task.time,
      strength: item.timeLocked ? "HARD" : "FLEXIBLE",
      toleranceMinutes: item.timeLocked ? 0 : 30,
      note: item.timeLocked ? "사용자가 시간을 고정함" : "앞뒤 30분 안의 대안 허용",
    },
  ];
  if (seat) constraints.push({ field: "seat", value: seat.value, strength: seat.strength, note: seat.note });
  for (const value of plan.situation.constraints) {
    if (/창가|홀|룸|테라스|좌석/.test(value)) continue;
    constraints.push({ field: `condition_${constraints.length}`, value, strength: constraintStrength(value), note: value });
  }
  return {
    venueName: item.title,
    venuePhone: task.phoneNumber,
    venueAddress: item.reality?.address || item.location,
    date: plan.situation.targetDate,
    time: task.time,
    partySize: plan.situation.partySize,
    reservationName: contact.name,
    category: item.category,
    constraints,
    specialRequests: [
      ...plan.situation.preferences,
      ...(plan.situation.personProfile?.constraints ?? []),
    ].filter(Boolean).slice(0, 12),
  };
}

function hardMismatch(goal: ReservationGoal, result: StructuredReservationResult): string | null {
  for (const constraint of goal.constraints.filter((entry) => entry.strength === "HARD")) {
    if (constraint.field === "date" && result.confirmedDate && result.confirmedDate !== constraint.value) return `날짜가 ${constraint.value}에서 ${result.confirmedDate}(으)로 달라졌어요.`;
    if (constraint.field === "partySize" && result.partySize != null && result.partySize !== constraint.value) return `인원이 ${constraint.value}명에서 ${result.partySize}명으로 달라졌어요.`;
    if (constraint.field === "reservationName" && result.reservationName && result.reservationName.replaceAll(" ", "") !== String(constraint.value).replaceAll(" ", "")) return `예약자명이 ${constraint.value}와 다르게 확인됐어요.`;
    if (constraint.field === "time" && result.confirmedTime && result.confirmedTime !== constraint.value) return `고정 시간 ${constraint.value}와 확인 시간 ${result.confirmedTime}이 달라요.`;
    if (constraint.field === "seat" && result.seat && !result.seat.includes(String(constraint.value))) return `필수 좌석 ${constraint.value} 대신 ${result.seat}만 가능해요.`;
  }
  return null;
}

function flexibleTimeMismatch(goal: ReservationGoal, result: StructuredReservationResult): string | null {
  const requested = goal.constraints.find((entry) => entry.field === "time" && entry.strength === "FLEXIBLE");
  if (!requested || !result.confirmedTime) return null;
  const from = minutes(String(requested.value));
  const to = minutes(result.confirmedTime);
  if (from == null || to == null) return null;
  if (Math.abs(from - to) > (requested.toleranceMinutes ?? 0)) return `허용한 시간 범위를 벗어난 ${result.confirmedTime}만 가능해요.`;
  return null;
}

export function enforceAuthorizationBoundary(goal: ReservationGoal, input: StructuredReservationResult): StructuredReservationResult {
  const missingConfirmation = input.status === "confirmed" && (!input.confirmedDate || !input.confirmedTime || input.partySize == null || !input.reservationName)
    ? "예약 확정에 필요한 날짜·시간·인원·예약자명 중 확인되지 않은 항목이 있어요."
    : null;
  const venueMismatch = input.status === "confirmed" && !input.venue.includes(goal.venueName) && !goal.venueName.includes(input.venue)
    ? `확인된 업체 ${input.venue}가 요청한 ${goal.venueName}와 일치하지 않아요.`
    : null;
  const mismatch = missingConfirmation ?? venueMismatch ?? hardMismatch(goal, input) ?? flexibleTimeMismatch(goal, input);
  const newMoney = Boolean(
    (input.deposit?.amount ?? 0) > 0
    || (input.minimumSpend?.amount ?? 0) > 0
    || input.additionalFees?.some((fee) => fee.amount > 0),
  );
  const uncertain = input.confidence < 0.72 || (input.status === "confirmed" && !input.finalReadbackConfirmed) || Boolean(input.contradiction);
  const inherentlyUncertain = ["duplicate_found", "inconclusive"].includes(input.status);
  if (mismatch || newMoney || uncertain || inherentlyUncertain) {
    return {
      ...input,
      status: "needs_user_action",
      requiresUserAction: true,
      retryRecommended: false,
      contradiction: mismatch ?? input.contradiction ?? (input.status === "confirmed" && !input.finalReadbackConfirmed ? "날짜·시간·인원·예약자명의 최종 확인이 부족해요." : undefined),
      failureReason: mismatch ?? input.failureReason,
    };
  }
  return input;
}

export function buildClawOpsCallInstruction(goal: ReservationGoal, contact: ReservationContact): string {
  const constraints = goal.constraints.map((entry) => `- ${entry.field}: ${entry.value} [${entry.strength}]${entry.toleranceMinutes != null ? ` 허용 ±${entry.toleranceMinutes}분` : ""}${entry.note ? ` (${entry.note})` : ""}`).join("\n");
  return [
    "당신은 Haruwith의 한국어 예약 전화 에이전트다. 고정 대본이 아니라 직원의 의미를 이해하며 예약 목표를 달성한다.",
    `예약 목표: ${goal.venueName}, ${goal.date} ${goal.time}, ${goal.partySize}명, 예약자 ${goal.reservationName}.`,
    "사용자 권한 경계:", constraints,
    "HARD 조건은 절대 바꾸거나 임의 확정하지 않는다. FLEXIBLE은 표시된 범위 안에서만 스스로 수락할 수 있고 PREFERRED는 불가해도 진행할 수 있다.",
    "새 예약금·추가요금·최소주문·코스 선주문·선결제·취소조건은 수락하거나 송금하지 말고 정확한 조건과 가능한 유지 시간을 확인한 뒤 사용자 확인 필요로 남긴다.",
    "카드번호·CVV·계좌 비밀번호는 말하거나 요청받아도 제공하지 않는다. 개인정보는 예약에 필요한 최소 범위만 제공한다.",
    `직원이 요청할 때만 예약자 전화번호 ${contact.phone}를 제공한다. 이름과 전화번호 외 불필요한 개인정보는 제공하지 않는다.`,
    "ARS, 통화중, 무응답, 잘못된 번호, 지점 불일치, 중복 예약, 좌석 변경, 이용시간 제한, 주차·케이크·콜키지·알레르기 같은 예상 밖 답변을 의미 단위로 확인한다.",
    "직원이 AI인지 물으면 Haruwith의 AI 예약 도우미라고 사실대로 답한다. 적대적 반응이면 정중히 통화를 끝내고 성공으로 표시하지 않는다.",
    "예약을 확정하기 전 날짜·시간·인원·예약자명을 한 문장으로 다시 읽고 직원의 명시적 확인을 받는다. 직원의 반복 내용이 다르면 모순을 바로 재확인한다.",
    `통화 목표는 ${RESERVATION_TARGET_SECONDS}초 이내다. 165초부터 핵심 결론과 최종 확인으로 수렴하고, 225초가 되면 미확정 조건을 기록한 뒤 정중히 종료한다.`,
    "예약 성공 여부가 불분명하면 절대로 성공이라고 말하지 않는다.",
  ].join("\n").slice(0, 4000);
}
