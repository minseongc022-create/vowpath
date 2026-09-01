"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPlan, savePlan } from "../lib/storage";
import { DAJEONG_BRAND } from "../lib/brand";
import { replacePlanItem } from "../lib/plan-engine";
import type { DajeongPlan, PlanItem, ReservationOrder } from "../lib/types";
import { ArrowIcon, CategoryIcon, CheckIcon, ClockIcon, MapPinIcon, RefreshIcon, ShieldIcon, SparkleIcon, WalletIcon } from "./DajeongIcons";

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

function ExecutionItem({ item, onDone, onAlternative }: { item: PlanItem; onDone: () => void; onAlternative: () => void }) {
  const isDone = item.status === "done";
  const completionLabel = item.handoffKind === "self"
    ? "준비했어요"
    : item.handoffKind === "gift"
      ? "실제로 구매했어요"
      : item.reservationRequired
        ? "실제로 예약했어요"
        : "이 장소로 정했어요";
  return (
    <article className={`dj-exec-item ${isDone ? "dj-exec-done" : ""}`}>
      <div className="dj-exec-check">{isDone ? <CheckIcon size={20} /> : <CategoryIcon category={item.category} size={20} />}</div>
      <div className="dj-exec-copy">
        <div className="dj-exec-meta"><span>{item.time}</span><span>{item.categoryLabel}</span><strong>{money(item.price)}</strong></div>
        <h3>{item.title}</h3>
        <p>{isDone ? "준비 완료로 기록했어요." : item.subtitle}</p>
        {item.reality && !isDone ? (
          <div className="dj-exec-reality">
            {item.reality.rating ? <span>★ {item.reality.rating.toFixed(1)}{item.reality.reviewCount ? ` · 리뷰 ${item.reality.reviewCount.toLocaleString("ko-KR")}` : ""}</span> : null}
            <span>{item.reality.priceConfidence === "provider" ? "가격대 확인됨" : "결제 전 금액 확인"}</span>
            <span>{item.reality.openNow === true ? "지금 영업 중" : item.reality.openNow === false ? "지금은 영업 종료" : "방문 시간 영업 확인"}</span>
          </div>
        ) : null}
        {!isDone ? <div className="dj-action-pipeline" aria-label="실행 단계"><span className="dj-pipeline-active">후보 발견</span><i /><span>가능 여부 확인</span><i /><span>사용자 승인</span><i /><span>완료 확인</span></div> : null}
        {!isDone ? (
          <div className="dj-exec-actions">
            {item.handoffKind === "self" ? null : (
              <a className="dj-btn dj-btn-secondary" href={item.href} target="_blank" rel="noreferrer">
                {item.provider} <ArrowIcon size={16} />
              </a>
            )}
            <button className="dj-btn dj-btn-primary" type="button" onClick={onDone}><CheckIcon size={16} /> {completionLabel}</button>
            {item.alternatives.length > 0 ? <button className="dj-exec-alt" type="button" onClick={onAlternative}><RefreshIcon size={14} /> 다른 선택이 필요해요</button> : null}
          </div>
        ) : null}
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
  useEffect(() => setPlan(getPlan(planId)), [planId]);
  useEffect(() => {
    if (!plan?.id || plan.status === "draft") return;
    let active = true;
    setReservationLoading(true);
    fetch("/api/dajeong/reservations/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then(async (response) => {
        const data = await response.json() as { order?: ReservationOrder; error?: string };
        if (!response.ok || !data.order) throw new Error(data.error || "예약 목록을 확인하지 못했어요.");
        if (active) setReservationOrder(data.order);
      })
      .catch((error) => { if (active) setReservationError(error instanceof Error ? error.message : "예약 목록을 확인하지 못했어요."); })
      .finally(() => { if (active) setReservationLoading(false); });
    return () => { active = false; };
    // The order is prepared once for this plan. Item completion does not recreate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  const doneCount = plan?.items.filter((item) => item.status === "done").length ?? 0;
  const progress = plan ? Math.round((doneCount / plan.items.length) * 100) : 0;
  const complete = Boolean(plan && doneCount === plan.items.length);

  function updateItem(itemId: string) {
    if (!plan) return;
    const items = plan.items.map((item) => item.id === itemId ? { ...item, status: "done" as const } : item);
    const next = { ...plan, items, status: items.every((item) => item.status === "done") ? "completed" as const : "confirmed" as const };
    setPlan(next);
    savePlan(next);
  }

  function useAlternative(item: PlanItem) {
    if (!plan || item.alternatives.length === 0) return;
    const preferred = [...item.alternatives].sort((a, b) => {
      const aOver = Math.max(0, plan.total - item.price + a.price - plan.budget);
      const bOver = Math.max(0, plan.total - item.price + b.price - plan.budget);
      return aOver - bOver || Math.abs(a.price - item.price) - Math.abs(b.price - item.price);
    })[0];
    const next = replacePlanItem(plan, item.category, preferred.id, item.id);
    setPlan(next);
    savePlan(next);
  }

  async function copySummary() {
    if (!plan) return;
    const summary = [`${plan.situation.targetDate} ${plan.title}`, ...plan.items.map((item) => `${plan.situation.planScope === "trip" ? `${item.dayNumber ?? 1}일차 ` : ""}${item.time} ${item.title}`), `예상 합계 ${money(plan.total)}`].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const nextItem = useMemo(() => plan?.items.find((item) => item.status !== "done"), [plan]);

  if (plan === undefined) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /><p>준비 목록을 확인하고 있어요</p></div>;
  if (!plan) return <div className="dj-empty-page dj-narrow"><span className="dj-empty-mark"><SparkleIcon size={28} /></span><h1>계획을 찾지 못했어요</h1><p>새로운 날을 다시 준비해 볼까요?</p><Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 만들기</Link></div>;

  return (
    <div className="dj-exec-page dj-container">
      <section className={`dj-exec-hero ${complete ? "dj-exec-celebrate" : ""}`}>
        <div className="dj-exec-hero-copy">
          <span className="dj-kicker"><SparkleIcon size={15} /> {complete ? "모든 준비가 끝났어요" : "이제 하나씩 확정하면 돼요"}</span>
          <h1>{complete ? "이제 마음만 전하면 돼요." : plan.title}</h1>
          <p>{complete ? "바쁜 와중에도 여기까지 잘 준비했어요. 오늘은 계획보다 서로에게 집중하세요." : `다음 준비는 “${nextItem?.title ?? "마무리"}”예요. 실제로 확정한 뒤 완료 버튼을 눌러 주세요.`}</p>
        </div>
        <div className="dj-progress-orbit"><strong>{progress}%</strong><span>{doneCount}/{plan.items.length} 완료</span></div>
      </section>

      <div className="dj-exec-toolbar">
        <div className="dj-exec-budget"><WalletIcon size={18} /><span>예상 합계</span><strong>{money(plan.total)}</strong><em>여유 {money(Math.max(0, plan.budgetRemaining))}</em></div>
        <div>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={() => downloadCalendar(plan)}><ClockIcon size={16} /> 캘린더에 담기</button>
          <button type="button" className="dj-btn dj-btn-secondary" onClick={copySummary}>{copied ? <><CheckIcon size={16} /> 복사했어요</> : "계획 복사"}</button>
        </div>
      </div>

      <section className="dj-reservation-desk dj-card" aria-live="polite">
        <div className="dj-reservation-assistant"><span><SparkleIcon size={18} /></span><div><strong>{DAJEONG_BRAND.assistantName}가 예약할 곳부터 살펴볼게요</strong><p>{reservationLoading ? "예약이 필요한 일정과 공식 예약 경로를 확인하고 있어요…" : reservationError || reservationOrder?.message || "예약 준비 목록을 불러오는 중이에요."}</p></div></div>
        {reservationOrder?.tasks.length ? <div className="dj-reservation-tasks">{reservationOrder.tasks.map((task) => <article key={task.id}><div><span>{task.time}</span><strong>{task.title}</strong><p>{task.explanation}</p></div><div className="dj-reservation-task-action">{task.depositAmount != null ? <b>예약금 {money(task.depositAmount)}</b> : <b>예약금 확인 후 안내</b>}<a href={task.bookingUrl} target="_blank" rel="noreferrer">{task.capability === "automatic" ? "좌석·예약금 확인" : "공식 예약 화면"} <ArrowIcon size={14} /></a></div></article>)}</div> : null}
        {reservationOrder?.tasks.length ? <div className="dj-deposit-approval"><ShieldIcon size={16} /><p><strong>돈이 필요한 순간에는 반드시 먼저 말씀드려요.</strong>가게별 예약금과 최종 결제액을 확인한 뒤 “이 금액으로 진행” 승인을 받아야만 결제 단계가 열립니다.</p></div> : null}
      </section>

      <section className="dj-exec-layout">
        <div className="dj-exec-list">
          {plan.items.map((item) => <ExecutionItem key={item.id} item={item} onDone={() => updateItem(item.id)} onAlternative={() => useAlternative(item)} />)}
        </div>
        <aside className="dj-exec-help dj-card">
          <span className="dj-help-icon"><ShieldIcon size={22} /></span>
          <h2>완료 버튼은<br />실제 확정 뒤에</h2>
          <p>검색 화면을 열었다는 이유만으로 예약·주문 완료로 처리하지 않아요. 제휴된 곳은 승인 후 {DAJEONG_BRAND.assistantName}가 실행하고, 아직 제휴되지 않은 곳은 공식 예약 화면을 가장 짧게 열어드려요.</p>
          <div className="dj-help-rule"><strong>실행 원칙</strong><span>후보 발견 → 실제 가능 여부 확인 → 사용자 승인 → 완료 확인 순서로 진행합니다. 지원되지 않는 예약은 가장 짧은 공식 확인 경로를 열어드려요.</span></div>
          <Link href={`/dajeong/plan/${plan.id}`} className="dj-help-link"><RefreshIcon size={15} /> 전체 계획 다시 검토</Link>
        </aside>
      </section>

      {complete ? <div className="dj-complete-card"><span>오늘을 위한 마지막 한 문장</span><blockquote>완벽하게 준비해서가 아니라, 당신을 생각하며 준비했어.</blockquote><Link href="/dajeong/plans" className="dj-btn dj-btn-secondary">내 계획 모아보기</Link></div> : null}
    </div>
  );
}
