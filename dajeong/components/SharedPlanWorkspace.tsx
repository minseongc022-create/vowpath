"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getLocalActor } from "../lib/storage";
import type { DajeongPlan } from "../lib/types";
import { ArrowIcon, ClockIcon, MapPinIcon, RefreshIcon, ShieldIcon, SparkleIcon } from "./DajeongIcons";

function money(value: number) { return `${new Intl.NumberFormat("ko-KR").format(value)}원`; }

export function SharedPlanWorkspace({ token }: { token: string }) {
  const [plan, setPlan] = useState<DajeongPlan | null | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const [access, setAccess] = useState<"viewer" | "editor">("viewer");
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const actor = typeof window === "undefined" ? { id: "shared_guest", name: "동반자" } : getLocalActor();

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/dajeong/shares/${encodeURIComponent(token)}?actorId=${encodeURIComponent(actor.id)}`, { cache: "no-store" });
      const data = await response.json() as { plan?: DajeongPlan; revision?: number; access?: "viewer" | "editor"; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error || "공유 계획을 불러오지 못했어요.");
      setPlan(data.plan);
      setRevision(data.revision ?? 0);
      setAccess(data.access ?? "viewer");
    } catch (error) {
      if (!silent) setMessage(error instanceof Error ? error.message : "공유 계획을 불러오지 못했어요.");
      if (!silent) setPlan(null);
    } finally { if (!silent) setLoading(false); }
  }, [actor.id, token]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function revise(event: FormEvent) {
    event.preventDefault();
    const text = instruction.trim();
    if (text.length < 2 || access !== "editor") return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dajeong/shares/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: { ...actor, name: actor.name === "나" ? "동반자" : actor.name }, baseRevision: revision, instruction: text }),
      });
      const data = await response.json() as { plan?: DajeongPlan; revision?: number; message?: string; error?: string };
      if (!response.ok || !data.plan) {
        if (response.status === 409 && data.plan) { setPlan(data.plan); setRevision(data.revision ?? revision); }
        throw new Error(data.error || "수정하지 못했어요.");
      }
      setPlan(data.plan);
      setRevision(data.revision ?? revision + 1);
      setMessage(data.message || "최신 공유 계획에 반영했어요.");
      setInstruction("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "수정하지 못했어요."); }
    finally { setLoading(false); }
  }

  if (plan === undefined) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /><p>공유 계획의 최신 상태를 불러오고 있어요</p></div>;
  if (!plan) return <div className="dj-empty-page dj-narrow"><span className="dj-empty-mark"><ShieldIcon size={28} /></span><h1>지금은 볼 수 없는 계획이에요</h1><p>{message || "소유자가 공유를 해제했거나 시크릿으로 전환했을 수 있어요."}</p><Link href="/dajeong" className="dj-btn dj-btn-primary">하루온으로 돌아가기</Link></div>;

  return <main className="dj-shared-page dj-container">
    <header className="dj-shared-header">
      <div><span><ShieldIcon size={15} /> 함께 보는 최신 계획</span><h1>{plan.title}</h1><p>{plan.summary}</p></div>
      <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshIcon size={16} /> 새로 고침</button>
    </header>
    <div className="dj-shared-status"><span>공유 버전 {revision}</span><span>{access === "editor" ? "함께 수정 가능" : "보기 전용"}</span><span>비공개 상세는 안전하게 제외됨</span></div>
    <section className="dj-shared-timeline">
      {plan.items.map((item) => <article key={item.id} className={`dj-card dj-shared-item ${item.title === "비공개 일정" ? "dj-shared-secret" : ""}`}>
        <div className="dj-shared-time"><strong>{item.time}</strong><small>{item.endTime ? `${item.endTime}까지` : `${item.durationMinutes}분`}</small></div>
        <div><span>{item.categoryLabel}</span><h2>{item.title}</h2><p>{item.subtitle}</p>{item.location ? <small><MapPinIcon size={13} /> {item.location}</small> : null}</div>
        <strong>{item.price ? money(item.price) : item.title === "비공개 일정" ? "상세 비공개" : "무료"}</strong>
      </article>)}
    </section>
    {access === "editor" ? <section className="dj-shared-chat">
      <div><SparkleIcon size={17} /><p><strong>하루온에게 함께 말해보세요</strong>공개된 일정만 수정할 수 있고, 소유자의 시크릿 정보는 AI 답변에도 노출되지 않아요.</p></div>
      <form onSubmit={revise}><input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="예: 카페를 좀 더 조용한 곳으로 바꿔줘" /><button type="submit" disabled={loading || instruction.trim().length < 2}><ArrowIcon size={17} /></button></form>
      {message ? <p className="dj-shared-message">{message}</p> : null}
    </section> : null}
    <div className="dj-shared-foot"><ClockIcon size={15} /> 계획이 바뀌면 15초 안에 자동으로 최신 상태를 확인합니다.</div>
  </main>;
}
