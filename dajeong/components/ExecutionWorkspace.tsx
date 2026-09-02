"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DAJEONG_BRAND } from "../lib/brand";
import { approvePayment, recordUserCompleted, requestPaymentReview } from "../lib/reservation-engine";
import { getPlan, savePlan } from "../lib/storage";
import type { BookingMethod, DajeongPlan, ReservationOrder, ReservationTask, ReservationTaskStatus } from "../lib/types";
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
  haruon_direct: "하루온 직접 실행",
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

function TaskCard({ task, onReport, onCopy }: { task: ReservationTask; onReport: () => void; onCopy: (text: string) => void }) {
  const exact = task.price.confidence === "provider_quote";
  const link = task.bookingMethod === "phone_only" && task.phoneNumber ? `tel:${task.phoneNumber}` : task.bookingUrl;
  return (
    <article className={`dj-execution-task dj-task-${task.status}`}>
      <div className="dj-execution-task-main">
        <div className="dj-execution-badges"><span>{task.dayNumber ? `${task.dayNumber}일차 · ` : ""}{task.time}</span><b>{METHOD_LABEL[task.bookingMethod]}</b><em>{STATUS_LABEL[task.status]}</em></div>
        <h3>{task.title}</h3>
        <p>{task.explanation}</p>
        <div className="dj-execution-facts">
          <span>{exact ? `확인 금액 ${money(task.price.confirmedTotalAmount ?? 0)}` : task.price.estimatedAmount ? `예상 ${money(task.price.estimatedAmount)}` : "가격 정보 없음"}</span>
          <span>{task.price.prepayAmount != null ? `지금 결제 ${money(task.price.prepayAmount)}` : "사전결제 금액 미확인"}</span>
          <span>{task.availability === "available" ? "이용 가능 확인" : task.availability === "unavailable" ? "현재 이용 불가" : "실시간 가능 여부 미확인"}</span>
        </div>
        {task.failureReason ? <p className="dj-execution-failure">{task.failureReason}</p> : null}
        {task.proposedChange ? <p className="dj-execution-proposal">대안 제안: {task.proposedChange.time ? `${task.proposedChange.time} · ` : ""}{task.proposedChange.title ?? task.proposedChange.reason}{task.proposedChange.amount != null ? ` · ${money(task.proposedChange.amount)}` : ""} — 승인 전에는 확정하지 않아요.</p> : null}
        {task.confirmation ? <div className="dj-execution-confirmation"><CheckIcon size={14} /><span>{task.confirmation.source === "provider" ? "제공자 확인" : "사용자 완료 확인"} · {task.confirmation.confirmationId}</span></div> : null}
        {task.phoneScript ? (
          <div className="dj-phone-script">
            <strong>전화할 때 이렇게 말하세요</strong>
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
          <div className="dj-privacy-note"><ShieldIcon size={14} /><span>예약 시 {task.privacy.requiredFields.map((field) => ({ name: "이름", phone: "전화번호", email: "이메일" })[field]).join("·")}가 필요할 수 있어요. 현재 하루온이 업체에 전달한 개인정보는 없습니다.</span></div>
        ) : null}
      </div>
      <div className="dj-execution-task-actions">
        {link ? <a className="dj-btn dj-btn-secondary" href={link} target={link.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer">{executionLinkLabel(task)} <ArrowIcon size={14} /></a> : null}
        {canReportCompletion(task) ? <button className="dj-btn dj-btn-primary" type="button" onClick={onReport}>{task.kind === "logistics" ? "이 단계 마쳤어요" : "외부에서 완료했다고 기록"}</button> : null}
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

  useEffect(() => {
    const stored = getPlan(planId);
    setPlan(stored);
    setReservationOrder(stored?.execution ?? null);
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
        if (!response.ok || !data.order) throw new Error(data.error || "실행 계획을 확인하지 못했어요.");
        if (!active) return;
        const next = { ...plan, execution: data.order };
        setPlan(next);
        setReservationOrder(data.order);
        savePlan(next);
      })
      .catch((error) => { if (active) setReservationError(error instanceof Error ? error.message : "실행 계획을 확인하지 못했어요."); })
      .finally(() => { if (active) setReservationLoading(false); });
    return () => { active = false; };
  }, [plan]);

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
    const details = window.prompt(task.kind === "logistics" ? "실제로 마친 내용을 짧게 적어 주세요." : "외부 예약·구매가 실제로 끝난 경우에만 확인번호나 완료 내용을 적어 주세요.");
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

  if (plan === undefined) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /><p>준비 목록을 확인하고 있어요</p></div>;
  if (!plan) return <div className="dj-empty-page dj-narrow"><span className="dj-empty-mark"><SparkleIcon size={28} /></span><h1>계획을 찾지 못했어요</h1><p>새로운 날을 다시 준비해 볼까요?</p><Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 만들기</Link></div>;

  const approval = reservationOrder?.approval;
  return (
    <div className="dj-exec-page dj-container">
      <section className={`dj-exec-hero ${complete ? "dj-exec-celebrate" : ""}`}>
        <div className="dj-exec-hero-copy">
          <span className="dj-kicker"><SparkleIcon size={15} /> {complete ? "확인된 실행 항목을 모두 마쳤어요" : "현실 실행 상태"}</span>
          <h1>{plan.title}</h1>
          <p>{complete ? "완료 확인번호와 사용자가 직접 완료했다고 기록한 항목을 기준으로 정리했어요." : `다음 확인은 “${nextTask?.title ?? "실행 항목"}”이에요. 확인되지 않은 가격·좌석·재고는 확정처럼 표시하지 않습니다.`}</p>
        </div>
        <div className="dj-progress-orbit"><strong>{progress}%</strong><span>{completedTasks}/{reservationOrder?.tasks.length ?? 0} 확인 완료</span></div>
      </section>

      <div className="dj-exec-toolbar">
        <div className="dj-exec-budget"><WalletIcon size={18} /><span>전체 예상</span><strong>{money(plan.total)}</strong><em>지금 확정 {money(reservationOrder?.payableNow ?? 0)}</em></div>
        <div>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={() => downloadCalendar(plan)}><ClockIcon size={16} /> 캘린더</button>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={copySummary}>{copied ? <><CheckIcon size={16} /> 복사했어요</> : "계획 복사"}</button>
        </div>
      </div>

      <section className="dj-cost-board dj-card" aria-label="결제 구분">
        <div><span>예상 총비용</span><strong>{money(reservationOrder?.estimatedTotal ?? plan.total)}</strong><small>장소 가격대 기반 예상 포함</small></div>
        <div><span>지금 결제 확인액</span><strong>{money(reservationOrder?.payableNow ?? 0)}</strong><small>제공자 견적이 확인된 금액만</small></div>
        <div><span>현장 예상 결제</span><strong>{money(reservationOrder?.onsiteEstimated ?? plan.total)}</strong><small>현장 변동 가능</small></div>
        <div><span>가격 미확인</span><strong>{reservationOrder?.unconfirmedPriceTaskIds.length ?? 0}개</strong><small>확인 전 결제 불가</small></div>
      </section>

      <section className="dj-reservation-desk dj-card" aria-live="polite">
        <div className="dj-reservation-assistant"><span><SparkleIcon size={18} /></span><div><strong>{DAJEONG_BRAND.assistantName}의 실행 계획</strong><p>{reservationLoading ? "예약 방식과 실제 실행 경로를 구분하고 있어요…" : reservationError || reservationOrder?.message || "실행 계획을 불러오는 중이에요."}</p></div></div>
        {approval && ["requested", "reapproval_required"].includes(approval.state) ? (
          <div className="dj-payment-approval">
            <div><ShieldIcon size={18} /><p><strong>{approval.state === "reapproval_required" ? "가격이 바뀌어 재승인이 필요해요" : "명시적 결제 승인이 필요해요"}</strong>{reservationOrder?.tasks.filter((task) => approval.taskIds.includes(task.id)).map((task) => task.title).join(", ")} · 지금 결제 {money(approval.amount)}</p></div>
            <button type="button" className="dj-btn dj-btn-primary" onClick={approveExactPayment}>위 항목 {money(approval.amount)} 결제 승인</button>
          </div>
        ) : approval?.state === "granted" ? (
          <div className="dj-deposit-approval"><ShieldIcon size={16} /><p><strong>{money(approval.amount)} 결제 승인을 기록했어요. 아직 결제 성공은 아니에요.</strong>하루온 직접 실행 파트너가 없는 항목은 외부 공식 화면에서 사용자가 완료하고 확인번호를 기록해야 합니다.</p></div>
        ) : (
          <div className="dj-deposit-approval"><ShieldIcon size={16} /><p><strong>“좋네”나 “이걸로 하자”는 결제 승인이 아니에요.</strong>실제 가능 여부와 정확한 사전결제 금액이 확인된 항목만 따로 보여주고 명시적 승인을 받습니다.</p>{reservationOrder?.tasks.length ? <button type="button" onClick={reviewPayment}>결제 항목·금액 검토</button> : null}</div>
        )}
      </section>

      <section className="dj-exec-layout">
        <div className="dj-execution-list">
          {reservationOrder?.tasks.map((task) => <TaskCard key={task.id} task={task} onReport={() => reportCompleted(task)} onCopy={copyText} />)}
          {!reservationLoading && !reservationOrder?.tasks.length ? <div className="dj-card dj-no-execution"><CheckIcon size={20} /><p>예약·구매할 항목은 없어요. 방문 직전 운영 여부만 확인해 주세요.</p></div> : null}
        </div>
        <aside className="dj-exec-help dj-card">
          <span className="dj-help-icon"><ShieldIcon size={22} /></span>
          <h2>확인된 사실만<br />실행 상태로</h2>
          <p>링크를 연 것, 검색 결과가 보인 것, 사용자가 애매하게 긍정한 것은 예약·구매·결제 성공이 아닙니다.</p>
          <div className="dj-help-rule"><strong>현재 자동 실행 범위</strong><span>연결된 예약·결제 제공자가 아직 없어 외부 공식 경로와 전화 문구를 준비합니다. 제공자 확인번호가 들어온 경우에만 자동 완료 상태가 됩니다.</span></div>
          <div className="dj-help-rule"><strong>개인정보</strong><span>이름·전화번호는 예약에 꼭 필요하고 사용자가 전달에 동의한 경우에만 해당 업체에 최소한으로 보낼 구조입니다. 현재 자동 전달은 없습니다.</span></div>
          <Link href={`/dajeong/plan/${plan.id}`} className="dj-help-link"><RefreshIcon size={15} /> 같은 채팅에서 계획 수정</Link>
        </aside>
      </section>

      {complete ? <div className="dj-complete-card"><span>실행 결과가 계획과 연결됐어요</span><blockquote>확인된 준비만 완료로 기록했습니다.</blockquote><Link href="/dajeong/plans" className="dj-btn dj-btn-secondary">내 계획 모아보기</Link></div> : null}
    </div>
  );
}
