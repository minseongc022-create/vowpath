"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { SendRequestSheet } from "@/components/SendRequestSheet";
import { Toast } from "@/components/Toast";
import { CHANNEL_HELP, formatWhen, statusClass, statusLabel } from "@/lib/format";
import { nextChaseStatus, summarize, withActivity } from "@/lib/store";
import type { ChaseStatus, ClientAccount } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

type Filter = "연락할 곳" | "늦은 곳" | "받은 곳" | "전부";

export default function DashboardPage() {
  const { ready, state, commit, toast } = useAppState();
  const [filter, setFilter] = useState<Filter>("연락할 곳");
  const [sending, setSending] = useState<ClientAccount | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const stats = useMemo(() => (state ? summarize(state.clients) : null), [state]);

  if (!ready || !state || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero text-sm text-ink-muted">
        불러오는 중…
      </div>
    );
  }

  function applySend(client: ClientAccount) {
    const nextStatus = nextChaseStatus(client.status);
    const next = withActivity(
      {
        ...state!,
        clients: state!.clients.map((c) =>
          c.id === client.id
            ? {
                ...c,
                status: nextStatus,
                lastSentAt: new Date().toISOString(),
                submittedAt: undefined,
              }
            : c,
        ),
      },
      `${client.name}(${client.phone})로 자료 요청을 보냈습니다 · ${statusLabel(nextStatus)}`,
    );
    commit(next, `${client.contactName}님께 보냈어요`);
    setSending(null);
  }

  function markDone(client: ClientAccount) {
    const next = withActivity(
      {
        ...state!,
        clients: state!.clients.map((c) =>
          c.id === client.id
            ? { ...c, status: "제출완료" as ChaseStatus, submittedAt: new Date().toISOString() }
            : c,
        ),
      },
      `${client.name} 자료를 받았다고 표시했습니다`,
    );
    commit(next, "자료 받았어요로 표시");
  }

  function runBulk() {
    const current = state;
    if (!current) return;
    const targets = current.clients.filter((c) => c.status !== "제출완료" && c.phone);
    if (!targets.length) {
      commit(current, "보낼 곳이 없습니다 (번호 있는 미제출만 가능)");
      setBulkOpen(false);
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
    next = withActivity(next, `미제출 ${targets.length}곳에 한꺼번에 자료 요청을 보냈습니다`);
    commit(next, `${targets.length}곳에 보냈어요`);
    setBulkOpen(false);
  }

  const filtered = state.clients
    .filter((c) => {
      if (filter === "연락할 곳") return c.status !== "제출완료";
      if (filter === "늦은 곳") return c.status === "지연";
      if (filter === "받은 곳") return c.status === "제출완료";
      return true;
    })
    .sort((a, b) => {
      const order = ["지연", "2차발송", "1차발송", "대기", "제출완료"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

  const needContact = stats.total - stats.done;

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <SendRequestSheet
        open={Boolean(sending)}
        client={sending}
        officeName={state.profile.officeName}
        monthLabel={state.monthLabel}
        onClose={() => setSending(null)}
        onConfirm={() => sending && applySend(sending)}
      />

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog">
          <button type="button" className="absolute inset-0 bg-ink/45" aria-label="닫기" onClick={() => setBulkOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-paper-card p-5 shadow-soft sm:rounded-3xl">
            <h2 className="font-display text-xl font-medium text-ink">안 낸 곳에 한꺼번에 보낼까요?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              ‘자료 받음’이 아니고, 휴대폰 번호가 있는 거래처에만 보냅니다. 연습 모드에서는 목록만 바뀝니다.
            </p>
            <p className="mt-3 text-sm font-medium text-ink">대상 약 {needContact}곳</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" className="sc-btn-primary flex-1" onClick={runBulk}>
                한꺼번에 보내기
              </button>
              <button type="button" className="sc-btn-secondary" onClick={() => setBulkOpen(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-pine-700">{state.monthLabel}</p>
          <h1 className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">오늘 자료 독촉</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            예전엔 사무원이 거래처에 전화·카톡으로 “자료 아직이세요?” 하던 일입니다. 지금은 거래처에 적어 둔
            <strong className="font-semibold text-ink"> 휴대폰 번호</strong>로 카카오 알림톡을 보냅니다.
          </p>
        </div>
        <button type="button" className="sc-btn-primary w-full sm:w-auto" onClick={() => setBulkOpen(true)}>
          안 낸 곳에 한꺼번에
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-pine-200 bg-pine-50/80 p-4 text-sm leading-relaxed text-pine-800">
        <p className="font-semibold text-pine-900">어디에 보내나요?</p>
        <p className="mt-1.5">{CHANNEL_HELP}</p>
        <p className="mt-2 text-xs text-pine-700/90">
          번호는 <span className="font-semibold">거래처</span> 메뉴에서 등록합니다. 번호가 없으면 보낼 수 없습니다.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "전체 거래처", value: stats.total },
          { label: "자료 받음", value: stats.done },
          { label: "아직 연락할 곳", value: needContact },
          { label: "늦은 곳", value: stats.delayed },
        ].map((s) => (
          <div key={s.label} className="sc-card px-4 py-4">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-1 font-display text-2xl text-ink sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["연락할 곳", "늦은 곳", "받은 곳", "전부"] as Filter[]).map((f) => (
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
        <span className="ml-auto self-center text-xs text-ink-muted">받은 비율 {stats.rate}%</span>
      </div>

      <ul className="mt-4 space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <li className="sc-card p-5 text-sm text-ink-muted">여기 해당하는 곳이 없습니다.</li>
        ) : (
          filtered.map((c) => (
            <li key={c.id} className="sc-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-muted">
                    {c.contactName} · {c.phone || "번호 없음"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">받을 자료: {c.docs.join(" · ")}</p>
              <p className="mt-1 text-xs text-ink-muted">마지막 연락 {formatWhen(c.lastSentAt)}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="sc-btn-primary flex-1 text-xs"
                  onClick={() => setSending(c)}
                  disabled={c.status === "제출완료"}
                >
                  자료 요청하기
                </button>
                <button type="button" className="sc-btn-secondary flex-1 text-xs" onClick={() => markDone(c)}>
                  자료 받았어요
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mt-4 hidden overflow-hidden sc-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper/80 text-xs tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">거래처</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">알림톡 번호</th>
                <th className="px-4 py-3 font-semibold">받을 자료</th>
                <th className="px-4 py-3 font-semibold">마지막 연락</th>
                <th className="px-4 py-3 font-semibold">할 일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    여기 해당하는 곳이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="bg-paper-card/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink-muted">{c.contactName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.docs.join(", ")}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatWhen(c.lastSentAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-pine-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-pine-800 disabled:opacity-40"
                          onClick={() => setSending(c)}
                          disabled={c.status === "제출완료"}
                        >
                          자료 요청하기
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-paper-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink"
                          onClick={() => markDone(c)}
                        >
                          자료 받았어요
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
        <h2 className="text-sm font-semibold text-ink">방금 한 일</h2>
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
