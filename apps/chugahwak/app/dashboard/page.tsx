"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardShell, Toast } from "@/components/SiteChrome";
import { getPlan } from "@/lib/plans";
import { approveUrl, projectOf, summarize, withActivity } from "@/lib/store";
import { formatWon, orderTotal, type ChangeOrder, type CoStatus } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

function statusClass(s: CoStatus) {
  switch (s) {
    case "승인":
    case "청구반영":
      return "bg-pine-100 text-pine-700";
    case "거절":
      return "bg-rose-soft text-rose-ink";
    case "보냄":
      return "bg-signal-soft text-signal-ink";
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
  const focus = state.orders
    .filter((o) => o.status === "보냄" || o.status === "작성중")
    .sort((a, b) => (a.status === "보냄" ? -1 : 1));

  function markSent(order: ChangeOrder) {
    const next = withActivity(
      {
        ...state!,
        orders: state!.orders.map((o) =>
          o.id === order.id ? { ...o, status: "보냄" as const, sentAt: new Date().toISOString() } : o,
        ),
      },
      `${order.title} 승인 링크 보냄 (연습)`,
    );
    commit(next, "보냄으로 표시");
  }

  function copyLink(order: ChangeOrder) {
    const url = approveUrl(order.token);
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
            {getPlan(state.profile.plan).name} · 추가공사 합의
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">오늘 합의</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            미승인·작성 중만 남깁니다. 고객은 앱 없이 링크에서 승인합니다.
          </p>
        </div>
        <Link href="/dashboard/new" className="sc-btn-primary w-full sm:w-auto">
          변경 만들기
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
          <li className="sc-card p-6 text-sm text-ink-muted">처리할 변경합의가 없습니다.</li>
        ) : (
          focus.map((o) => {
            const p = projectOf(state, o.projectId);
            return (
              <li key={o.id} className="sc-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {p?.name} · CO #{o.number}
                    </p>
                    <p className="text-sm text-ink-muted">{o.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {p?.clientName} · {p?.phone} · {formatWon(orderTotal(o))}
                      {o.daysExtend ? ` · +${o.daysExtend}일` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(o.status)}`}>
                    {o.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "작성중" ? (
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
                    고객 화면 열기
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
