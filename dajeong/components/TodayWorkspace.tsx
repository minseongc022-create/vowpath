"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { resolveIdentity } from "../lib/identity";
import { getPlan, savePlan } from "../lib/storage";
import { fetchSharedPlan, planRole, reviseAnyPlan } from "../lib/plan-sync";
import { buildLiveSnapshot, currentClock, type LiveSnapshot } from "../lib/live-engine";
import { DAJEONG_BRAND } from "../lib/brand";
import type { ConciergeMessage, DajeongNotification, DajeongPlan } from "../lib/types";
import { ArrowIcon, CategoryIcon, ClockIcon, MapPinIcon, ShieldIcon, SparkleIcon } from "./DajeongIcons";

function money(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function chatMessage(role: ConciergeMessage["role"], text: string, status: ConciergeMessage["status"] = "done"): ConciergeMessage {
  return { id: `today_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, role, text, status, createdAt: new Date().toISOString() };
}

const PREP_STATUS_LABEL: Record<string, string> = { suggested: "제안됨", confirmed: "준비 확정", ordered: "주문 완료", ready: "준비 완료", picked_up: "픽업 완료", delivered: "전달 완료", cancelled: "취소됨" };

const quickActions = [
  { label: "여기 더 있고 싶어요", text: "여기 더 있고 싶어" },
  { label: "많이 늦어지고 있어요", text: "생각보다 많이 늦어지고 있어" },
  { label: "다음 거 그냥 뺄래요", text: "다음 거 그냥 빼자" },
  { label: "집에 좀 일찍 갈래요", text: "집에 좀 일찍 갈래" },
];

export function TodayWorkspace({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<DajeongPlan | null | undefined>(undefined);
  const [identity, setIdentity] = useState({ id: "", name: "나" });
  const myId = identity.id;
  const [nowClock, setNowClock] = useState(() => currentClock());
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [proactive, setProactive] = useState<DajeongNotification | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
    const me = await resolveIdentity();
    setIdentity(me);
    const local = getPlan(planId);
    if (local && (local.planKind !== "shared" || local.ownerId === me.id)) {
      setPlan(local);
      if (local.planKind === "shared") {
        fetch(`/api/dajeong/plans/shared?planId=${planId}&viewerId=${me.id}`)
          .then((response) => response.json())
          .then((data: { plan?: DajeongPlan; version?: number }) => { if (data.plan) setPlan({ ...data.plan, sharedVersion: data.version }); })
          .catch(() => {});
      }
      return;
    }
    fetch(`/api/dajeong/plans/shared?planId=${planId}&viewerId=${me.id}`)
      .then((response) => response.json())
      .then((data: { plan?: DajeongPlan; version?: number; error?: string }) => setPlan(data.plan ? { ...data.plan, sharedVersion: data.version } : null))
      .catch(() => setPlan(local ?? null));
    })();
  }, [planId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowClock(currentClock()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!plan?.id || plan.planKind !== "shared" || !identity.id) return;
    const planId2 = plan.id;
    const viewerId = identity.id;
    const currentVersion = plan.sharedVersion;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetchSharedPlan(planId2, viewerId).then((result) => {
        if (result && result.version !== currentVersion) setPlan(result.plan);
      });
    };
    // Background poll while the day is actively being followed, plus an immediate check the
    // moment the tab/app comes back to the foreground — that catches "the other person just
    // changed something" far faster than waiting out the poll interval.
    const timer = window.setInterval(check, 15_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [plan?.id, plan?.planKind, plan?.sharedVersion, identity.id]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // "하루위드가 먼저 말 걸기" — shows the most relevant already-delivered/due proactive message for
  // this plan in the same place a push notification would have opened. In-app, so it reads as
  // one continuous experience instead of a duplicate ping on top of what the push already said.
  useEffect(() => {
    if (!plan?.id || !identity.id) return;
    fetch(`/api/dajeong/notifications/list?personId=${encodeURIComponent(identity.id)}`)
      .then((response) => response.json())
      .then((data: { notifications?: DajeongNotification[] }) => {
        const forThisPlan = (data.notifications ?? []).filter((entry) => entry.planId === plan.id && new Date(entry.scheduledFor).getTime() <= Date.now());
        setProactive(forThisPlan[0] ?? null);
      })
      .catch(() => {});
  }, [plan?.id, identity.id]);

  async function sendInstruction(text: string) {
    const trimmed = text.trim();
    if (!plan || trimmed.length < 2 || busy) return;
    setBusy(true);
    setInstruction("");
    const searching = chatMessage("assistant", "지금 상황을 반영해서 남은 일정을 확인하고 있어요…", "searching");
    setMessages((current) => [...current, chatMessage("user", trimmed), searching]);
    try {
      const result = await reviseAnyPlan(plan, identity.id, identity.name, trimmed);
      setPlan(result.plan);
      if (planRole(result.plan, identity.id) !== "companion") savePlan(result.plan);
      setMessages((current) => current.map((message) => message.id === searching.id ? { ...message, text: result.message || (result.conflict ? "다른 사람이 방금 바꿨어요. 최신 내용을 다시 불러왔어요." : "확인했어요."), status: "done" as const } : message));
    } catch (error) {
      const text = error instanceof Error ? error.message : "잠시 후 다시 말해 주세요.";
      setMessages((current) => current.map((message) => message.id === searching.id ? { ...message, text, status: "error" } : message));
    } finally {
      setBusy(false);
    }
  }

  if (plan === undefined) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /><p>오늘 일정을 불러오고 있어요</p></div>;
  if (!plan) return <div className="dj-empty-page dj-narrow"><span className="dj-empty-mark"><SparkleIcon size={28} /></span><h1>이 계획을 찾지 못했어요</h1><p>공유가 해제되었거나 이 기기에서 볼 수 없는 계획일 수 있어요.</p><Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 만들기</Link></div>;

  const role = planRole(plan, myId);
  const snapshot: LiveSnapshot = buildLiveSnapshot(plan, nowClock);
  const todayPrep = (plan.prep ?? [])
    .filter((item) => item.date === plan.situation.targetDate && item.status !== "cancelled")
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  return (
    <div className="dj-today-page dj-container">
      <div className="dj-plan-breadcrumb"><Link href={`/dajeong/plan/${plan.id}`}>계획으로 돌아가기</Link></div>
      <section className="dj-today-hero">
        <div>
          <span className="dj-kicker"><ClockIcon size={15} /> 오늘 일정 · {nowClock}</span>
          <h1>{plan.title}</h1>
          <p>{role === "companion" ? `${plan.ownerName ?? "동반자"}님이 공유한 오늘의 일정이에요.` : "지금 무엇을 하면 되는지만 빠르게 볼 수 있어요."}</p>
        </div>
        {role !== "solo" ? <span className={`dj-role-chip dj-role-${role}`}>{role === "owner" ? `${plan.companionName ?? "동반자"}와 공유 중` : "공유받은 계획"}</span> : null}
      </section>

      {proactive ? (
        <div className="dj-proactive-banner" role="status">
          <span className="dj-proactive-mark"><SparkleIcon size={16} /></span>
          <div>
            <strong>{proactive.title}</strong>
            <p>{proactive.body}</p>
          </div>
          <button type="button" aria-label="닫기" onClick={() => setProactive(null)}>×</button>
        </div>
      ) : null}

      {snapshot.allDone ? (
        <div className="dj-complete-card"><span>오늘 일정을 모두 마쳤어요</span><blockquote>수고했어요. 남은 하루도 편하게 보내세요.</blockquote></div>
      ) : (
        <>
          {snapshot.current ? (
            <article className="dj-today-current dj-card">
              <span className="dj-today-label">지금</span>
              <div className="dj-today-current-head"><CategoryIcon category={snapshot.current.category} size={22} /><h2>{snapshot.current.title}</h2></div>
              <p>{snapshot.current.time} ~ {snapshot.current.endTime ?? "종료 시간 계산 중"} · {snapshot.current.reality?.address || snapshot.current.location}</p>
              {snapshot.runningLateMinutes > 0 ? <span className="dj-today-delay">예정보다 약 {snapshot.runningLateMinutes}분 길어지고 있어요</span> : null}
            </article>
          ) : (
            <article className="dj-today-current dj-today-between dj-card">
              <span className="dj-today-label">지금</span>
              <p>{snapshot.next ? `${snapshot.next.title}로 이동하는 시간이에요.` : "오늘 남은 일정을 확인하고 있어요."}</p>
            </article>
          )}

          {snapshot.next ? (
            <article className="dj-today-next dj-card">
              <span className="dj-today-label">다음</span>
              <div className="dj-today-current-head"><CategoryIcon category={snapshot.next.category} size={20} /><h3>{snapshot.next.title}</h3></div>
              <p><ClockIcon size={14} /> {snapshot.next.time} 시작{snapshot.next.travelFromPrevious ? ` · 이동 ${snapshot.next.travelFromPrevious.mode} 약 ${snapshot.next.travelFromPrevious.minutes}분` : ""}</p>
              {snapshot.next.reservationRequired ? <span className="dj-fixed-chip"><ShieldIcon size={13} /> {snapshot.next.reality?.reservationLabel ?? "예약 확인 필요"}</span> : null}
            </article>
          ) : null}

          {todayPrep.length ? (
            <section className="dj-today-remaining">
              <span className="dj-summary-eyebrow">오늘 준비할 것</span>
              {todayPrep.map((item) => (
                <div key={item.id} className="dj-today-remaining-row">
                  <span>{item.time ?? "시간 미정"}</span>
                  <ClockIcon size={16} />
                  <strong>{item.title}{item.visibility === "secret" ? " (비공개)" : ""}</strong>
                  <em>{PREP_STATUS_LABEL[item.status] ?? item.status}</em>
                </div>
              ))}
            </section>
          ) : null}

          {snapshot.weatherNote ? <div className="dj-weather-banner dj-weather-user_report"><div><strong>날씨 변화</strong><p>{snapshot.weatherNote}</p></div></div> : null}
          {snapshot.prepReminders.length ? <div className="dj-schedule-warnings"><strong>미리 확인하면 좋아요</strong>{snapshot.prepReminders.map((reminder) => <p key={reminder}>{reminder}</p>)}</div> : null}

          {snapshot.remaining.length ? (
            <section className="dj-today-remaining">
              <span className="dj-summary-eyebrow">남은 일정</span>
              {snapshot.remaining.map((item) => (
                <div key={item.id} className="dj-today-remaining-row">
                  <span>{item.time}</span>
                  <CategoryIcon category={item.category} size={16} />
                  <strong>{item.title}</strong>
                  <em>{money(item.price)}</em>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}

      <section className="dj-revision-studio">
        <div className="dj-revision-heading"><span className="dj-concierge-avatar"><SparkleIcon size={18} /></span><div><strong>{DAJEONG_BRAND.assistantName}에게 지금 상황을 말해 주세요</strong><p>지연, 연장, 조기 귀가처럼 오늘 바뀌는 것만 다시 계산해요.</p></div></div>
        <div className="dj-concierge-chat" aria-live="polite" ref={chatRef}>
          {messages.slice(-12).map((message) => (
            <div key={message.id} className={`dj-chat-message dj-chat-${message.role} dj-chat-${message.status}`}>
              {message.role === "assistant" ? <span className="dj-chat-avatar"><SparkleIcon size={13} /></span> : null}
              <p>{message.text}{message.status === "searching" ? <i className="dj-thinking-dots"><b /><b /><b /></i> : null}</p>
            </div>
          ))}
        </div>
        <form className="dj-revision-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void sendInstruction(instruction); }}>
          <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="예: 밥이 늦게 나와서 아직 식당이야" aria-label="지금 상황 말하기" />
          <button type="submit" disabled={busy || instruction.trim().length < 2}>{busy ? <span className="dj-spinner dj-spinner-coral" /> : <ArrowIcon size={18} />}</button>
        </form>
        <div className="dj-revision-examples">{quickActions.map((action) => <button key={action.text} type="button" onClick={() => void sendInstruction(action.text)} disabled={busy}>{action.label}</button>)}</div>
      </section>

      <div className="dj-today-footer"><Link href={`/dajeong/plan/${plan.id}`} className="dj-help-link"><MapPinIcon size={15} /> 전체 계획으로 돌아가기</Link></div>
    </div>
  );
}
