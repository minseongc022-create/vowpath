"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardShell, Toast } from "@/components/SiteChrome";
import { getPlan } from "@/lib/plans";
import { approveUrl, projectOf, summarize, withActivity } from "@/lib/store";
import { claimAmount, formatWon, netPayable, type AppStatus, type PayApp } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

function statusClass(s: AppStatus) {
  switch (s) {
    case "승인":
      return "bg-pine-100 text-pine-700";
    case "거절":
      return "bg-rose-soft text-rose-ink";
    case "보냄":
      return "bg-signal-soft text-signal-ink";
    case "수정요청":
      return "bg-steel-100 text-steel-800";
    default:
      return "bg-paper text-ink-muted border border-paper-line";
  }
}

export default function DashboardPage() {
  const { ready, state, commit, toast } = useAppState();
  const stats = useMemo(() => (state ? summarize(state) : null), [state]);

  if (!ready || !state || !stats) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const plan = getPlan(state.profile.plan);
  const focus = state.apps
    .filter((o) => o.status === "보냄" || o.status === "작성중" || o.status === "수정요청")
    .sort((a, b) => {
      const rank = (s: AppStatus) => (s === "보냄" ? 0 : s === "수정요청" ? 1 : 2);
      return rank(a.status) - rank(b.status);
    });

  function markSent(app: PayApp) {
    const next = withActivity(
      {
        ...state!,
        apps: state!.apps.map((o) =>
          o.id === app.id ? { ...o, status: "보냄" as const, sentAt: new Date().toISOString() } : o,
        ),
      },
      `${app.title} 승인 링크 보냄 (연습)`,
    );
    commit(next, "보냄으로 표시");
  }

  function copyLink(app: PayApp) {
    const url = approveUrl(app.token);
    navigator.clipboard.writeText(url).then(
      () => commit(state!, "링크 복사됨"),
      () => commit(state!, url),
    );
  }

  return (
    <DashboardShell companyName={state.profile.companyName}>
      <Toast message={toast} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-steel-700">
            {getPlan(state.profile.plan).name} · 기성 승인
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">오늘 기성</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            미승인·작성·수정요청만 남깁니다. 원청은 앱 없이 링크에서 승인합니다.
          </p>
        </div>
        <Link href="/dashboard/new" className="sc-btn-primary w-full sm:w-auto">
          기성 만들기
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "현장", value: `${stats.projects}/${plan.projectsLimit}` },
          { label: "처리 필요", value: stats.pending },
          { label: "승인 대기액", value: formatWon(stats.pendingWon) },
          { label: "승인 누적", value: formatWon(stats.approvedWon) },
        ].map((s) => (
          <div key={s.label} className="sc-card px-4 py-4">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-1 font-display text-xl text-ink sm:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {focus.length === 0 ? (
          <li className="sc-card p-6 text-sm text-ink-muted">처리할 기성청구가 없습니다.</li>
        ) : (
          focus.map((o) => {
            const p = projectOf(state, o.projectId);
            return (
              <li key={o.id} className="sc-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {p?.name} · 기성 #{o.number} · {o.period}
                    </p>
                    <p className="text-sm text-ink-muted">{o.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {p?.approverName} · {p?.phone} · 청구 {formatWon(claimAmount(o))} · 실지급{" "}
                      {formatWon(netPayable(o))}
                    </p>
                    {o.approverNote ? (
                      <p className="mt-2 text-xs text-steel-700">수정요청: {o.approverNote}</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(o.status)}`}>
                    {o.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "작성중" || o.status === "수정요청" ? (
                    <button type="button" className="sc-btn-primary text-xs" onClick={() => markSent(o)}>
                      보냄 처리
                    </button>
                  ) : null}
                  <button type="button" className="sc-btn-secondary text-xs" onClick={() => copyLink(o)}>
                    승인 링크 복사
                  </button>
                  <a
                    href={approveUrl(o.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-btn-secondary text-xs"
                  >
                    원청 화면 열기
                  </a>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="mt-8 sc-card p-4">
        <h2 className="text-sm font-semibold text-ink">방금 한 일</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          {state.activity.slice(0, 6).map((a) => (
            <li key={a.id}>{a.message}</li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
