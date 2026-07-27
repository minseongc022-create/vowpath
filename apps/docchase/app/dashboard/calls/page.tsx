"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { buildCallQueue, callScript, urgencyLabel } from "@/lib/chase";
import { planAllows } from "@/lib/plans";
import { withActivity } from "@/lib/store";
import type { CallOutcome, ClientAccount } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

const OUTCOMES: CallOutcome[] = ["통화약속", "부재", "거부", "받음확인"];

export default function CallQueuePage() {
  const { ready, state, commit, toast } = useAppState();
  const [scriptFor, setScriptFor] = useState<ClientAccount | null>(null);

  const queue = useMemo(() => (state ? buildCallQueue(state.clients) : []), [state]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const can = planAllows(state.profile.plan, "callQueue");

  function setOutcome(client: ClientAccount, outcome: CallOutcome) {
    const nextClients = state!.clients.map((c) => {
      if (c.id !== client.id) return c;
      const done = outcome === "받음확인";
      return {
        ...c,
        callOutcome: outcome,
        callNote: outcome || undefined,
        inCallQueue: outcome === "부재" || outcome === "통화약속",
        status: done ? ("제출완료" as const) : c.status,
        submittedAt: done ? new Date().toISOString() : c.submittedAt,
      };
    });
    commit(
      withActivity({ ...state!, clients: nextClients }, `${client.name} 전화 결과: ${outcome}`),
      "전화 결과 저장",
    );
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">전화 잔여 큐</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
        알림톡·원탭으로도 안 끝난 곳만 남습니다. 자동수집 도구에는 없는{" "}
        <strong className="font-semibold text-ink">마감 독촉 OS</strong>의 마지막 단계입니다.
      </p>

      {!can ? (
        <p className="mt-4 text-sm text-amber-ink">이 플랜에서 전화 큐를 사용할 수 있습니다 — 설정에서 확인하세요.</p>
      ) : null}

      {scriptFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog">
          <button type="button" className="absolute inset-0 bg-ink/45" aria-label="닫기" onClick={() => setScriptFor(null)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-paper-card p-5 shadow-soft sm:rounded-3xl">
            <h2 className="font-display text-xl text-ink">전화 스크립트</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {callScript(state.profile.officeName, scriptFor, state.monthLabel)}
            </p>
            <a href={`tel:${scriptFor.phone.replace(/\D/g, "")}`} className="sc-btn-primary mt-5 flex w-full justify-center">
              {scriptFor.phone} 걸기
            </a>
            <button type="button" className="sc-btn-secondary mt-2 w-full" onClick={() => setScriptFor(null)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}

      <ul className="mt-8 space-y-3">
        {queue.length === 0 ? (
          <li className="sc-card p-6 text-sm text-ink-muted">전화할 곳이 없습니다. 알림톡·원탭으로 마감이 닫히고 있습니다.</li>
        ) : (
          queue.map((c) => {
            const u = urgencyLabel(c);
            return (
              <li key={c.id} className="sc-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-muted">
                      {c.contactName} · {c.phone}
                      {c.assignee ? ` · 담당 ${c.assignee}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      u.tone === "hot"
                        ? "bg-rose-soft text-rose-ink"
                        : u.tone === "warn"
                          ? "bg-amber-soft text-amber-ink"
                          : "bg-pine-50 text-pine-800"
                    }`}
                  >
                    {u.label}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="sc-btn-primary text-xs" onClick={() => setScriptFor(c)}>
                    스크립트·걸기
                  </button>
                  {OUTCOMES.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        c.callOutcome === o ? "border-pine-600 bg-pine-50 text-pine-800" : "border-paper-line bg-white"
                      }`}
                      onClick={() => setOutcome(c, o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </DashboardShell>
  );
}
