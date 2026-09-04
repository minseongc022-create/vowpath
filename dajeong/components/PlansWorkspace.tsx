"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveIdentity } from "../lib/identity";
import { listPlans, removePlan } from "../lib/storage";
import type { DajeongPlan } from "../lib/types";
import { ArrowIcon, CheckIcon, ClockIcon, HeartIcon, MapPinIcon, SparkleIcon, TrashIcon } from "./DajeongIcons";

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PlansWorkspace() {
  const [plans, setPlans] = useState<DajeongPlan[] | null>(null);
  useEffect(() => {
    const refresh = () => setPlans(listPlans());
    // resolveIdentity() has to land (and cache its result) before the very first read, or a
    // just-logged-in user's list would render from a stale/anonymous cache for one tick and
    // — worse — a shared computer's leftover cache could briefly attribute the wrong owner.
    void resolveIdentity().then(refresh);
    window.addEventListener("dajeong:plans-updated", refresh);
    return () => window.removeEventListener("dajeong:plans-updated", refresh);
  }, []);

  function remove(id: string) {
    if (!window.confirm("이 계획을 목록에서 지울까?")) return;
    removePlan(id);
    setPlans(listPlans());
  }

  if (!plans) return <div className="dj-loading-page"><span className="dj-spinner dj-spinner-coral" /></div>;
  return (
    <div className="dj-plans-page dj-narrow">
      <div className="dj-plans-heading"><div><span className="dj-kicker"><HeartIcon size={15} /> 준비한 마음들</span><h1>내 계획</h1><p>이 브라우저에 저장한 계획을 다시 열어서 이어갈 수 있어.</p></div><Link href="/dajeong" className="dj-btn dj-btn-primary">새 계획 <ArrowIcon size={16} /></Link></div>
      {plans.length === 0 ? (
        <div className="dj-plans-empty dj-card"><span><SparkleIcon size={28} /></span><h2>아직 만든 계획이 없어</h2><p>한 문장만 말해주면 첫 계획을 바로 정리해줄게.</p><Link href="/dajeong" className="dj-btn dj-btn-primary">첫 계획 만들기</Link></div>
      ) : (
        <div className="dj-plans-list">
          {plans.map((plan) => {
            const done = plan.items.filter((item) => item.status === "done").length;
            const href = plan.status === "draft" ? `/dajeong/plan/${plan.id}` : `/dajeong/plan/${plan.id}/execute`;
            const isToday = plan.situation.targetDate === todayKey();
            return (
              <article key={plan.id} className="dj-saved-plan dj-card">
                <Link href={href} className="dj-saved-plan-main">
                  <span className={`dj-status-mark dj-status-${plan.status}`}>{plan.status === "completed" ? <CheckIcon size={18} /> : <HeartIcon size={18} />}</span>
                  <div><div className="dj-saved-meta"><span><ClockIcon size={13} />{displayDate(plan.situation.targetDate)}</span><span><MapPinIcon size={13} />{plan.situation.region}</span>{isToday ? <span className="dj-today-badge">오늘</span> : null}{plan.planKind === "shared" ? <span className="dj-today-badge dj-today-badge-shared">공유 중</span> : null}</div><h2>{plan.title}</h2><p>{plan.summary}</p></div>
                  <div className="dj-saved-progress"><strong>{plan.status === "draft" ? "검토 중" : plan.status === "completed" ? "준비 완료" : `${done}/${plan.items.length} 완료`}</strong><span>예상 {new Intl.NumberFormat("ko-KR").format(plan.total)}원</span><ArrowIcon size={18} /></div>
                </Link>
                {isToday ? <Link href={`/dajeong/plan/${plan.id}/today`} className="dj-plan-today-link" aria-label={`${plan.title} 오늘 일정 보기`}><ClockIcon size={15} /></Link> : null}
                <button type="button" className="dj-plan-delete" aria-label={`${plan.title} 삭제`} onClick={() => remove(plan.id)}><TrashIcon size={16} /></button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

