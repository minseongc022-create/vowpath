"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { formatWhen, statusClass } from "@/lib/format";
import { loadState, saveState, summarize } from "@/lib/store";
import type { AppState, ChaseStatus, ClientAccount } from "@/lib/types";

function requireSession(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return false;
  if (!window.localStorage.getItem("suimcheck.session")) {
    router.replace("/login");
    return false;
  }
  return true;
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    if (!requireSession(router)) return;
    setState(loadState());
  }, [router]);

  const stats = useMemo(() => (state ? summarize(state.clients) : null), [state]);

  function updateClient(id: string, patch: Partial<ClientAccount>) {
    if (!state) return;
    const next: AppState = {
      ...state,
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
    saveState(next);
    setState(next);
  }

  function simulateSend(client: ClientAccount) {
    const nextStatus: ChaseStatus =
      client.status === "대기" || client.status === "제출완료"
        ? "1차발송"
        : client.status === "1차발송"
          ? "2차발송"
          : client.status === "2차발송"
            ? "지연"
            : "지연";
    updateClient(client.id, {
      status: client.status === "제출완료" ? "1차발송" : nextStatus,
      lastSentAt: new Date().toISOString(),
      submittedAt: undefined,
    });
  }

  if (!state || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero text-sm text-ink-muted">
        현황판 불러오는 중…
      </div>
    );
  }

  const sorted = [...state.clients].sort((a, b) => {
    const order = ["지연", "2차발송", "1차발송", "대기", "제출완료"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700">
            {state.monthLabel} 마감
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">이번 달 제출 현황</h1>
          <p className="mt-2 text-sm text-ink-muted">
            미제출·지연만 먼저 처리하세요. 완료된 수임처는 아래로 밀립니다.
          </p>
        </div>
        <button
          type="button"
          className="sc-btn-primary"
          onClick={() => {
            const targets = state.clients.filter((c) => c.status !== "제출완료");
            let next = { ...state, clients: [...state.clients] };
            targets.forEach((t) => {
              next = {
                ...next,
                clients: next.clients.map((c) =>
                  c.id === t.id
                    ? {
                        ...c,
                        status: (c.status === "대기"
                          ? "1차발송"
                          : c.status === "1차발송"
                            ? "2차발송"
                            : "지연") as ChaseStatus,
                        lastSentAt: new Date().toISOString(),
                      }
                    : c,
                ),
              };
            });
            saveState(next);
            setState(next);
          }}
        >
          미제출 일괄 요청 (시뮬레이션)
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          { label: "수임처", value: stats.total },
          { label: "제출완료", value: stats.done },
          { label: "요청·대기", value: stats.inFlight },
          { label: "지연", value: stats.delayed },
        ].map((s) => (
          <div key={s.label} className="sc-card px-4 py-4">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-1 font-display text-3xl text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 sc-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">회수율 {stats.rate}%</p>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-paper">
            <div className="h-full bg-pine-600 transition-all" style={{ width: `${stats.rate}%` }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper/80 text-xs uppercase tracking-wide text-ink-muted">
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
              {sorted.map((c) => (
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
                        className="rounded-md border border-paper-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-pine-500"
                        onClick={() => simulateSend(c)}
                      >
                        요청 보내기
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-pine-200 bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-800"
                        onClick={() =>
                          updateClient(c.id, {
                            status: "제출완료",
                            submittedAt: new Date().toISOString(),
                          })
                        }
                      >
                        제출완료
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
