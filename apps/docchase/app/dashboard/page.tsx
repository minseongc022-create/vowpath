"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { formatWhen, statusClass } from "@/lib/format";
import { nextChaseStatus, summarize, withActivity } from "@/lib/store";
import type { ChaseStatus, ClientAccount } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

type Filter = "전체" | "미제출" | "지연" | "완료";

export default function DashboardPage() {
  const { ready, state, commit, toast } = useAppState();
  const [filter, setFilter] = useState<Filter>("미제출");

  const stats = useMemo(() => (state ? summarize(state.clients) : null), [state]);

  if (!ready || !state || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero text-sm text-ink-muted">
        현황판 불러오는 중…
      </div>
    );
  }

  function updateClient(id: string, patch: Partial<ClientAccount>, message: string) {
    const next = withActivity(
      {
        ...state!,
        clients: state!.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
      message,
    );
    commit(next, message);
  }

  function simulateSend(client: ClientAccount) {
    const nextStatus = nextChaseStatus(client.status);
    updateClient(
      client.id,
      {
        status: nextStatus,
        lastSentAt: new Date().toISOString(),
        submittedAt: undefined,
      },
      `${client.name}에 ${nextStatus === "1차발송" ? "1차" : nextStatus === "2차발송" ? "2차" : "지연"} 요청을 보냈습니다 (시뮬레이션)`,
    );
  }

  function markDone(client: ClientAccount) {
    updateClient(
      client.id,
      { status: "제출완료", submittedAt: new Date().toISOString() },
      `${client.name} 제출완료로 표시했습니다`,
    );
  }

  function bulkSend() {
    const current = state;
    if (!current) return;
    const targets = current.clients.filter((c) => c.status !== "제출완료");
    if (!targets.length) {
      commit(current, "미제출 수임처가 없습니다");
      return;
    }
    let next = { ...current, clients: [...current.clients] };
    targets.forEach((t) => {
      next = {
        ...next,
        clients: next.clients.map((c) =>
          c.id === t.id
            ? {
                ...c,
                status: nextChaseStatus(c.status) as ChaseStatus,
                lastSentAt: new Date().toISOString(),
              }
            : c,
        ),
      };
    });
    next = withActivity(next, `미제출 ${targets.length}곳에 일괄 요청 (시뮬레이션)`);
    commit(next, `미제출 ${targets.length}곳에 요청을 보냈습니다`);
  }

  const filtered = state.clients
    .filter((c) => {
      if (filter === "미제출") return c.status !== "제출완료";
      if (filter === "지연") return c.status === "지연";
      if (filter === "완료") return c.status === "제출완료";
      return true;
    })
    .sort((a, b) => {
      const order = ["지연", "2차발송", "1차발송", "대기", "제출완료"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-pine-700">{state.monthLabel} 마감</p>
          <h1 className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">이번 달 제출 현황</h1>
          <p className="mt-2 text-sm text-ink-muted">미제출·지연부터 처리하세요. 요청은 데모에서 시뮬레이션됩니다.</p>
        </div>
        <button type="button" className="sc-btn-primary w-full sm:w-auto" onClick={bulkSend}>
          미제출 일괄 요청
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "수임처", value: stats.total },
          { label: "제출완료", value: stats.done },
          { label: "요청·대기", value: stats.inFlight },
          { label: "지연", value: stats.delayed },
        ].map((s) => (
          <div key={s.label} className="sc-card px-4 py-4">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-1 font-display text-2xl text-ink sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["미제출", "지연", "완료", "전체"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`min-h-10 rounded-full px-3.5 text-sm font-medium ${
              filter === f ? "bg-ink text-paper" : "border border-paper-line bg-white text-ink-muted"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-ink-muted">회수율 {stats.rate}%</span>
      </div>

      {/* Mobile cards */}
      <ul className="mt-4 space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <li className="sc-card p-5 text-sm text-ink-muted">이 필터에 해당하는 수임처가 없습니다.</li>
        ) : (
          filtered.map((c) => (
            <li key={c.id} className="sc-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-muted">
                    {c.contactName} · 매월 {c.deadlineDay}일
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(c.status)}`}>
                  {c.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">{c.docs.join(" · ")}</p>
              <p className="mt-1 text-xs text-ink-muted">최근 요청 {formatWhen(c.lastSentAt)}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="sc-btn-secondary flex-1 text-xs" onClick={() => simulateSend(c)}>
                  요청 보내기
                </button>
                <button type="button" className="sc-btn-primary flex-1 text-xs" onClick={() => markDone(c)}>
                  제출완료
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-hidden sc-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper/80 text-xs tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">수임처</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">마감일</th>
                <th className="px-4 py-3 font-semibold">필요 자료</th>
                <th className="px-4 py-3 font-semibold">최근 요청</th>
                <th className="px-4 py-3 font-semibold">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    이 필터에 해당하는 수임처가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="bg-paper-card/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink-muted">
                        {c.contactName} · {c.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">매월 {c.deadlineDay}일</td>
                    <td className="px-4 py-3 text-ink-muted">{c.docs.join(", ")}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatWhen(c.lastSentAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-paper-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-pine-500"
                          onClick={() => simulateSend(c)}
                        >
                          요청 보내기
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-pine-200 bg-pine-50 px-2.5 py-1.5 text-xs font-semibold text-pine-800"
                          onClick={() => markDone(c)}
                        >
                          제출완료
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 sc-card p-4">
        <h2 className="text-sm font-semibold text-ink">최근 활동</h2>
        <ul className="mt-3 space-y-2">
          {(state.activity || []).slice(0, 6).map((a) => (
            <li key={a.id} className="flex gap-3 text-sm text-ink-muted">
              <span className="shrink-0 text-xs text-ink-muted/70">{formatWhen(a.at)}</span>
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
