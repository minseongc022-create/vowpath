"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DAJEONG_BRAND } from "../lib/brand";
import { resolveIdentity } from "../lib/identity";
import { applyBookingCallOutcome, approvePayment, markTaskCalling, recordUserCompleted, requestPaymentReview } from "../lib/reservation-engine";
import { callPreviewScript, canCallForBooking, outcomeMessage } from "../lib/booking-call-brief";
import { prefilledBookingLink, prefilledLinkNote } from "../lib/booking-links";
import { getPlan, savePlan } from "../lib/storage";
import type { BookingCallRecord, BookingMethod, DajeongPlan, ReservationOrder, ReservationTask, ReservationTaskStatus } from "../lib/types";
import { ArrowIcon, CheckIcon, ClockIcon, RefreshIcon, ShieldIcon, SparkleIcon, WalletIcon } from "./DajeongIcons";

function money(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function icsDate(date: string, time: string, addMinutes = 0): string {
  const local = new Date(`${date}T${time}:00`);
  local.setMinutes(local.getMinutes() + addMinutes);
  return local.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function itineraryDate(startDate: string, dayNumber = 1): string {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + Math.max(0, dayNumber - 1));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function downloadCalendar(plan: DajeongPlan) {
  const events = plan.items.map((item) => [
    "BEGIN:VEVENT",
    `UID:${plan.id}-${item.id}@dajeong.local`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART:${icsDate(itineraryDate(plan.situation.targetDate, item.dayNumber), item.time)}`,
    `DTEND:${icsDate(itineraryDate(plan.situation.targetDate, item.dayNumber), item.time, item.durationMinutes)}`,
    `SUMMARY:${item.categoryLabel} · ${item.title}`,
    `DESCRIPTION:${item.notes.join(" / ")}`,
    "END:VEVENT",
  ].join("\r\n")).join("\r\n");
  const file = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dajeong//Plan//KO", events, "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${DAJEONG_BRAND.name}-${plan.situation.targetDate}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const METHOD_LABEL: Record<BookingMethod, string> = {
  haruon_direct: "하루위드 직접 실행",
  external_online: "업체 공식 온라인",
  external_platform: "외부 예약 플랫폼",
  phone_only: "전화 예약만 가능",
  walk_in: "현장 방문",
  no_reservation: "예약 불필요",
  unsupported: "현재 연동 미지원",
};

const STATUS_LABEL: Record<ReservationTaskStatus, string> = {
  not_started: "아직 실행 안 함",
  checking: "예약 방식·가능 여부 확인 중",
  needs_information: "추가 정보 필요",
  needs_approval: "사용자 승인 필요",
  needs_deposit: "예약금 확인 필요",
  ready: "실행 준비됨",
  user_action: "사용자가 직접 완료해야 함",
  executing: "실행 중",
  completed: "단계 완료",
  booked: "예약 완료",
  purchased: "구매 완료",
  failed: "실패",
  phone_required: "사용자가 직접 전화 필요",
  alternative_required: "대안 선택 필요",
  cancel_requested: "취소 요청",
  refund_pending: "환불 진행 중",
  refunded: "환불 완료",
  unsupported: "현재 지원하지 않는 방식",
};

function isCompleted(task: ReservationTask): boolean {
  return ["completed", "booked", "purchased", "refunded"].includes(task.status);
}

function canReportCompletion(task: ReservationTask): boolean {
  return (task.kind === "logistics" || ["external_online", "external_platform", "phone_only"].includes(task.bookingMethod))
    && !isCompleted(task);
}

function executionLinkLabel(task: ReservationTask): string {
  if (task.bookingMethod === "external_online") return "공식 예약 화면";
  if (task.bookingMethod === "external_platform") return "예약 플랫폼 열기";
  if (task.bookingMethod === "phone_only") return "전화 걸기";
  return "상세 정보 확인";
}

/** 하루위드가 대신 걸어줄 수 있는 항목인지 — 배포 설정과 항목 상태가 둘 다 맞아야 한다. */
function canHaruwithCall(task: ReservationTask, configured: boolean): boolean {
  return configured && task.capability === "automatic" && task.bookingMethod === "phone_only" && canCallForBooking(task);
}

const CALL_STATUS_LABEL: Record<BookingCallRecord["status"], string> = {
  queued: "전화 거는 중",
  in_progress: "통화 중",
  finished: "통화 끝",
  failed: "전화를 걸지 못했어",
  cancelled: "취소했어",
};

function CallPanel({ task, plan, call, busy, onStart }: {
  task: ReservationTask;
  plan: DajeongPlan;
  call?: BookingCallRecord;
  busy: boolean;
  onStart: (contact: { name?: string; phone?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(plan.ownerName ?? "");
  const [phone, setPhone] = useState("");

  if (call && (call.status === "queued" || call.status === "in_progress")) {
    return (
      <div className="dj-call-live" aria-live="polite">
        <span className="dj-spinner dj-spinner-coral" />
        <p><strong>{CALL_STATUS_LABEL[call.status]}</strong> {call.placeName}에 걸고 있어. 끝나면 결과를 여기에 적을게.</p>
      </div>
    );
  }

  if (call && call.status === "finished") {
    return <div className="dj-call-result"><CheckIcon size={14} /><p>{outcomeMessage(call)}{call.summary ? <em>{call.summary}</em> : null}</p></div>;
  }

  if (!open) {
    return (
      <button type="button" className="dj-btn dj-btn-primary dj-call-start" onClick={() => setOpen(true)} disabled={busy}>
        하루위드가 대신 전화할게
      </button>
    );
  }

  return (
    <div className="dj-call-consent">
      <strong>가게에 이렇게 말할게</strong>
      <p className="dj-call-script">{callPreviewScript({ task, plan, contact: { name: name.trim() || undefined, phone: phone.trim() || undefined } })}</p>
      <label>
        <span>예약자 이름</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="가게에 알려줄 이름" maxLength={40} />
      </label>
      <label>
        <span>연락처</span>
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="가게가 다시 연락할 번호" maxLength={30} inputMode="tel" />
      </label>
      <p className="dj-call-consent-note">
        <ShieldIcon size={13} /> 적은 이름·번호는 이 가게에만 전달돼. 결제는 절대 대신 하지 않고, 가게가 확답한 것만 예약 완료로 적을게.
      </p>
      <div className="dj-call-consent-actions">
        <button type="button" className="dj-btn dj-btn-primary" disabled={busy} onClick={() => { setOpen(false); onStart({ name: name.trim() || undefined, phone: phone.trim() || undefined }); }}>
          {busy ? "거는 중…" : "지금 전화 걸기"}
        </button>
        <button type="button" className="dj-btn dj-btn-secondary" onClick={() => setOpen(false)}>취소</button>
      </div>
    </div>
  );
}

function TaskCard({ task, plan, call, callConfigured, callBusy, onCall, onReport, onCopy }: {
  task: ReservationTask;
  plan: DajeongPlan;
  call?: BookingCallRecord;
  callConfigured: boolean;
  callBusy: boolean;
  onCall: (contact: { name?: string; phone?: string }) => void;
  onReport: () => void;
  onCopy: (text: string) => void;
}) {
  const exact = task.price.confidence === "provider_quote";
  const online = ["external_online", "external_platform"].includes(task.bookingMethod);
  const prefilled = online ? prefilledBookingLink(task, plan) : null;
  const link = task.bookingMethod === "phone_only" && task.phoneNumber
    ? `tel:${task.phoneNumber}`
    : prefilled?.url || task.bookingUrl;
  const showCall = canHaruwithCall(task, callConfigured) || Boolean(call);
  return (
    <article className={`dj-execution-task dj-task-${task.status}`}>
      <div className="dj-execution-task-main">
        <div className="dj-execution-badges">{task.itemId.startsWith("prep_") ? <span className="dj-prep-badge">준비물</span> : null}{task.itemId.startsWith("discovery_") ? <span className="dj-prep-badge">발견한 행사</span> : null}<span>{task.dayNumber ? `${task.dayNumber}일차 · ` : ""}{task.time}</span><b>{METHOD_LABEL[task.bookingMethod]}</b><em>{STATUS_LABEL[task.status]}</em></div>
        <h3>{task.title}</h3>
        <p>{task.explanation}</p>
        <div className="dj-execution-facts">
          <span>{exact ? `확인 금액 ${money(task.price.confirmedTotalAmount ?? 0)}` : task.price.estimatedAmount ? `예상 ${money(task.price.estimatedAmount)}` : "가격 정보 없음"}</span>
          <span>{task.price.prepayAmount != null ? `지금 결제 ${money(task.price.prepayAmount)}` : "사전결제 금액 미확인"}</span>
          <span>{task.availability === "available" ? "이용 가능 확인" : task.availability === "unavailable" ? "현재 이용 불가" : "실시간 가능 여부 미확인"}</span>
        </div>
        {task.failureReason ? <p className="dj-execution-failure">{task.failureReason}</p> : null}
        {task.proposedChange ? <p className="dj-execution-proposal">대안 제안: {task.proposedChange.time ? `${task.proposedChange.time} · ` : ""}{task.proposedChange.title ?? task.proposedChange.reason}{task.proposedChange.amount != null ? ` · ${money(task.proposedChange.amount)}` : ""} — 네가 승인하기 전엔 확정 안 해.</p> : null}
        {task.confirmation ? <div className="dj-execution-confirmation"><CheckIcon size={14} /><span>{task.confirmation.source === "provider" ? "제공자 확인" : "사용자 완료 확인"} · {task.confirmation.confirmationId}</span></div> : null}
        {showCall ? <CallPanel task={task} plan={plan} call={call} busy={callBusy} onStart={onCall} /> : null}
        {prefilled?.filled.length ? <p className="dj-prefilled-note">{prefilledLinkNote(prefilled)}</p> : null}
        {task.phoneScript && !canHaruwithCall(task, callConfigured) ? (
          <div className="dj-phone-script">
            <strong>전화할 때 이렇게 말하면 돼</strong>
            <p>{task.phoneScript}</p>
            <button type="button" onClick={() => onCopy(task.phoneScript ?? "")}>문구 복사</button>
          </div>
        ) : null}
        {task.bookingMethod === "phone_only" ? (
          <div className="dj-phone-facts">
            <span>전화번호 {task.phoneNumber ?? "확인되지 않음"}</span>
            <span>전화 가능 시간 {task.phoneHours?.join(" · ") || "확인되지 않음"}</span>
          </div>
        ) : null}
        {task.privacy.requiredFields.length ? (
          <div className="dj-privacy-note"><ShieldIcon size={14} /><span>예약 시 {task.privacy.requiredFields.map((field) => ({ name: "이름", phone: "전화번호", email: "이메일" })[field]).join("·")}가 필요할 수 있어. 지금까지 하루위드가 가게에 넘긴 개인정보는 없어.</span></div>
        ) : null}
      </div>
      <div className="dj-execution-task-actions">
        {link ? <a className="dj-btn dj-btn-secondary" href={link} target={link.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer">{executionLinkLabel(task)} <ArrowIcon size={14} /></a> : null}
        {canReportCompletion(task) ? <button className="dj-btn dj-btn-primary" type="button" onClick={onReport}>{task.kind === "logistics" ? "이 단계 끝냈어" : "외부에서 완료했다고 기록"}</button> : null}
      </div>
    </article>
  );
}

export function ExecutionWorkspace({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<DajeongPlan | null | undefined>(undefined);
  const [reservationOrder, setReservationOrder] = useState<ReservationOrder | null>(null);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [copied, setCopied] = useState(false);
  const [personId, setPersonId] = useState("");
  const [calls, setCalls] = useState<BookingCallRecord[]>([]);
  const [callConfigured, setCallConfigured] = useState(false);
  const [callBusyTaskId, setCallBusyTaskId] = useState("");
  const [callError, setCallError] = useState("");
  // 이미 계획에 반영한 통화는 다시 반영하지 않는다 — 폴링할 때마다 같은 결과가 덮어써지면
  // 사용자가 그 뒤에 손으로 고친 상태까지 되돌아간다.
  const appliedCalls = useRef(new Set<string>());

  useEffect(() => {
    void resolveIdentity().then((identity) => {
      setPersonId(identity.id);
      const stored = getPlan(planId);
      setPlan(stored);
      setReservationOrder(stored?.execution ?? null);
    });
  }, [planId]);

  useEffect(() => {
    if (!plan?.id || plan.status === "draft" || plan.execution) return;
    let active = true;
    setReservationLoading(true);
    fetch("/api/dajeong/reservations/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then(async (response) => {
        const data = await response.json() as { order?: ReservationOrder; error?: string };
        if (!response.ok || !data.order) throw new Error(data.error || "실행 계획을 못 불러왔어.");
        if (!active) return;
        const next = { ...plan, execution: data.order };
        setPlan(next);
        setReservationOrder(data.order);
        savePlan(next);
      })
      .catch((error) => { if (active) setReservationError(error instanceof Error ? error.message : "실행 계획을 못 불러왔어."); })
      .finally(() => { if (active) setReservationLoading(false); });
    return () => { active = false; };
  }, [plan]);

  const refreshCalls = useCallback(async () => {
    if (!personId || !planId) return;
    try {
      const response = await fetch(`/api/dajeong/booking-calls?planId=${encodeURIComponent(planId)}&personId=${encodeURIComponent(personId)}`);
      const data = await response.json() as { calls?: BookingCallRecord[]; configured?: boolean };
      if (!response.ok) return;
      setCallConfigured(Boolean(data.configured));
      setCalls(data.calls ?? []);
    } catch {
      // 통화 목록을 못 불러왔다고 실행 화면 전체가 멈출 이유는 없다.
    }
  }, [personId, planId]);

  useEffect(() => { void refreshCalls(); }, [refreshCalls]);

  // 통화가 진행 중일 때만 주기적으로 확인한다 — 끝난 뒤에도 계속 물어보면 의미 없는 요청만 쌓인다.
  useEffect(() => {
    const waiting = calls.some((call) => call.status === "queued" || call.status === "in_progress");
    if (!waiting) return;
    const timer = window.setInterval(() => { void refreshCalls(); }, 5_000);
    return () => window.clearInterval(timer);
  }, [calls, refreshCalls]);

  // 끝난 통화의 결과를 실행 목록에 한 번씩만 반영한다.
  useEffect(() => {
    if (!reservationOrder) return;
    const fresh = calls.filter((call) => call.status === "finished" && call.outcome && !appliedCalls.current.has(call.id));
    if (!fresh.length) return;
    let next = reservationOrder;
    for (const call of fresh) {
      appliedCalls.current.add(call.id);
      next = applyBookingCallOutcome(next, call);
    }
    saveOrder(next);
    // saveOrder는 plan 상태에만 의존해서 의존성 배열에 넣으면 루프가 된다 — 통화 목록 변화에만 반응한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls]);

  async function startBookingCall(task: ReservationTask, contact: { name?: string; phone?: string }) {
    if (!plan || !personId || !reservationOrder) return;
    setCallBusyTaskId(task.id);
    setCallError("");
    try {
      const response = await fetch("/api/dajeong/booking-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          planId: plan.id,
          plan,
          taskId: task.id,
          approveCall: true,
          discloseName: contact.name,
          disclosePhone: contact.phone,
        }),
      });
      const data = await response.json() as { call?: BookingCallRecord; error?: string };
      if (!response.ok || !data.call) {
        setCallError(data.error ?? "전화를 걸지 못했어.");
        if (data.call) setCalls((previous) => [data.call as BookingCallRecord, ...previous.filter((entry) => entry.id !== data.call?.id)]);
        return;
      }
      setCalls((previous) => [data.call as BookingCallRecord, ...previous.filter((entry) => entry.id !== data.call?.id)]);
      saveOrder(markTaskCalling(reservationOrder, task.id));
    } catch {
      setCallError("전화를 거는 중에 문제가 생겼어. 잠시 후 다시 해볼래?");
    } finally {
      setCallBusyTaskId("");
    }
  }

  function saveOrder(order: ReservationOrder) {
    if (!plan) return;
    const completedItemIds = new Set(order.tasks.filter(isCompleted).map((task) => task.itemId));
    const items = plan.items.map((item) => completedItemIds.has(item.id) ? { ...item, status: "done" as const } : item);
    const next: DajeongPlan = { ...plan, items, execution: order, status: items.every((item) => item.status === "done") ? "completed" : "confirmed" };
    setReservationOrder(order);
    setPlan(next);
    savePlan(next);
  }

  function reportCompleted(task: ReservationTask) {
    if (!reservationOrder) return;
    const details = window.prompt(task.kind === "logistics" ? "실제로 끝낸 내용을 짧게 적어줘." : "밖에서 예약·구매를 진짜로 끝냈을 때만 확인번호나 완료 내용을 적어줘.");
    if (!details?.trim()) return;
    saveOrder(recordUserCompleted(reservationOrder, task.id, details.trim()));
  }

  function reviewPayment() {
    if (!reservationOrder) return;
    saveOrder(requestPaymentReview(reservationOrder));
  }

  function approveExactPayment() {
    if (!reservationOrder?.approval) return;
    const tasks = reservationOrder.tasks.filter((task) => reservationOrder.approval?.taskIds.includes(task.id));
    const approvalText = `${tasks.map((task) => task.title).join(", ")} ${reservationOrder.approval.amount}원 결제 승인에 동의합니다`;
    saveOrder(approvePayment(reservationOrder, approvalText));
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function copySummary() {
    if (!plan) return;
    const summary = [`${plan.situation.targetDate} ${plan.title}`, ...plan.items.map((item) => `${plan.situation.planScope === "trip" ? `${item.dayNumber ?? 1}일차 ` : ""}${item.time} ${item.title}`), `예상 합계 ${money(plan.total)}`].join("\n");
    await copyText(summary);
  }

  const completedTasks = reservationOrder?.tasks.filter(isCompleted).length ?? 0;
  const progress = reservationOrder?.tasks.length ? Math.round(completedTasks / reservationOrder.tasks.length * 100) : 0;
  const complete = Boolean(reservationOrder?.tasks.length && completedTasks === reservationOrder.tasks.length);
  const nextTask = useMemo(() => reservationOrder?.tasks.find((task) => !isCompleted(task)), [reservationOrder]);
  // 항목별 최신 통화 한 건만 보여준다 — 다시 건 경우 옛날 결과가 위에 남아 있으면 헷갈린다.
  const callByTask = useMemo(() => {
    const map = new Map<string, BookingCallRecord>();
    for (const call of calls) if (!map.has(call.taskId)) map.set(call.taskId, call);
    return map;
  }, [calls]);

  if (plan === undefined) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /><p>준비 목록 확인 중</p></div>;
  if (!plan) return <div className="dj-empty-page dj-narrow"><span className="dj-empty-mark"><SparkleIcon size={28} /></span><h1>계획을 못 찾았어</h1><p>새로 하나 만들어볼까?</p><Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 만들기</Link></div>;

  const approval = reservationOrder?.approval;
  return (
    <div className="dj-exec-page dj-container">
      <section className={`dj-exec-hero ${complete ? "dj-exec-celebrate" : ""}`}>
        <div className="dj-exec-hero-copy">
          <span className="dj-kicker"><SparkleIcon size={15} /> {complete ? "확인된 실행 항목을 다 끝냈어" : "지금 실행 상태"}</span>
          <h1>{plan.title}</h1>
          <p>{complete ? "확인번호가 있거나 네가 직접 완료했다고 기록한 것만 정리했어." : `다음은 “${nextTask?.title ?? "실행 항목"}” 차례야. 확인 안 된 가격·좌석·재고는 확정된 것처럼 적지 않아.`}</p>
        </div>
        <div className="dj-progress-orbit"><strong>{progress}%</strong><span>{completedTasks}/{reservationOrder?.tasks.length ?? 0} 확인 완료</span></div>
      </section>

      <div className="dj-exec-toolbar">
        <div className="dj-exec-budget"><WalletIcon size={18} /><span>전체 예상</span><strong>{money(plan.total)}</strong><em>지금 확정 {money(reservationOrder?.payableNow ?? 0)}</em></div>
        <div>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={() => downloadCalendar(plan)}><ClockIcon size={16} /> 캘린더</button>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={copySummary}>{copied ? <><CheckIcon size={16} /> 복사했어</> : "계획 복사"}</button>
        </div>
      </div>

      <section className="dj-cost-board dj-card" aria-label="결제 구분">
        <div><span>예상 총비용</span><strong>{money(reservationOrder?.estimatedTotal ?? plan.total)}</strong><small>장소 가격대 기반 예상 포함</small></div>
        <div><span>지금 결제 확인액</span><strong>{money(reservationOrder?.payableNow ?? 0)}</strong><small>제공자 견적이 확인된 금액만</small></div>
        <div><span>현장 예상 결제</span><strong>{money(reservationOrder?.onsiteEstimated ?? plan.total)}</strong><small>현장 변동 가능</small></div>
        <div><span>가격 미확인</span><strong>{reservationOrder?.unconfirmedPriceTaskIds.length ?? 0}개</strong><small>확인 전 결제 불가</small></div>
      </section>

      <section className="dj-reservation-desk dj-card" aria-live="polite">
        <div className="dj-reservation-assistant"><span><SparkleIcon size={18} /></span><div><strong>{DAJEONG_BRAND.assistantName}의 실행 계획</strong><p>{reservationLoading ? "예약 방식이랑 실제 실행 경로를 나누는 중…" : reservationError || reservationOrder?.message || "실행 계획을 불러오는 중이야."}</p></div></div>
        {approval && ["requested", "reapproval_required"].includes(approval.state) ? (
          <div className="dj-payment-approval">
            <div><ShieldIcon size={18} /><p><strong>{approval.state === "reapproval_required" ? "가격이 바뀌어서 다시 승인받아야 해" : "결제하려면 네 승인이 필요해"}</strong>{reservationOrder?.tasks.filter((task) => approval.taskIds.includes(task.id)).map((task) => task.title).join(", ")} · 지금 결제 {money(approval.amount)}</p></div>
            <button type="button" className="dj-btn dj-btn-primary" onClick={approveExactPayment}>위 항목 {money(approval.amount)} 결제 승인</button>
          </div>
        ) : approval?.state === "granted" ? (
          <div className="dj-deposit-approval"><ShieldIcon size={16} /><p><strong>{money(approval.amount)} 결제 승인은 기록했어. 아직 결제가 된 건 아니야.</strong>하루위드가 직접 처리할 수 없는 항목은 공식 예약 화면에서 네가 끝내고 확인번호를 남겨야 해.</p></div>
        ) : (
          <div className="dj-deposit-approval"><ShieldIcon size={16} /><p><strong>“좋네”나 “이걸로 하자”는 결제 승인으로 안 봐.</strong>진짜 가능한지와 정확한 금액이 확인된 항목만 따로 보여주고, 그때 분명하게 승인받을게.</p>{reservationOrder?.tasks.length ? <button type="button" onClick={reviewPayment}>결제 항목·금액 검토</button> : null}</div>
        )}
      </section>

      {callError ? <p className="dj-call-error" role="alert">{callError}</p> : null}

      <section className="dj-exec-layout">
        <div className="dj-execution-list">
          {reservationOrder?.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              plan={plan}
              call={callByTask.get(task.id)}
              callConfigured={callConfigured}
              callBusy={callBusyTaskId === task.id}
              onCall={(contact) => { void startBookingCall(task, contact); }}
              onReport={() => reportCompleted(task)}
              onCopy={copyText}
            />
          ))}
          {!reservationLoading && !reservationOrder?.tasks.length ? <div className="dj-card dj-no-execution"><CheckIcon size={20} /><p>예약하거나 살 건 없어. 가기 직전에 문 여는지만 확인해줘.</p></div> : null}
        </div>
        <aside className="dj-exec-help dj-card">
          <span className="dj-help-icon"><ShieldIcon size={22} /></span>
          <h2>확인된 사실만<br />실행 상태로</h2>
          <p>링크를 연 것, 검색 결과가 뜬 것, 네가 애매하게 좋다고 한 것은 예약·구매·결제가 된 게 아니야.</p>
          <div className="dj-help-rule"><strong>현재 자동 실행 범위</strong><span>{callConfigured
            ? "전화로 예약받는 곳은 내가 대신 전화해서 가능 여부·금액·취소 조건까지 확인할게. 온라인 예약만 받는 곳은 공식 예약 화면으로 연결해주고, 결제는 어떤 경우에도 대신 하지 않아."
            : "연결된 예약·결제 제공자가 아직 없어서, 공식 예약 경로랑 전화할 때 쓸 문구를 준비해줘. 제공자 확인번호가 들어왔을 때만 자동으로 완료가 돼."}</span></div>
          <div className="dj-help-rule"><strong>개인정보</strong><span>이름·전화번호는 예약에 꼭 필요하고 네가 그 항목에서 직접 적어 승인했을 때만, 그 가게에만 전달돼.</span></div>
          <Link href={`/dajeong/plan/${plan.id}`} className="dj-help-link"><RefreshIcon size={15} /> 같은 채팅에서 계획 수정</Link>
        </aside>
      </section>

      {complete ? <div className="dj-complete-card"><span>실행 결과를 계획에 붙였어</span><blockquote>확인된 것만 완료로 기록했어.</blockquote><Link href="/dajeong/plans" className="dj-btn dj-btn-secondary">내 계획 모아보기</Link></div> : null}
    </div>
  );
}
