"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { PlanBadge, UpgradeHint } from "@/components/PlanUI";
import { SendRequestSheet } from "@/components/SendRequestSheet";
import { Toast } from "@/components/Toast";
import { urgencyLabel } from "@/lib/chase";
import { CHANNEL_HELP, formatBytes, formatWhen, sendStepLabel, statusClass, statusLabel, WEDGE_ONE_LINER } from "@/lib/format";
import { getPlan, planAllows } from "@/lib/plans";
import { requestAlimtalkSend, fetchAlimtalkStatus } from "@/lib/sendClient";
import { nextChaseStatus, replyUrlFor, submitUrlFor, summarize, withActivity } from "@/lib/store";
import type { ChaseStatus, ClientAccount } from "@/lib/types";
import { isDoneStatus } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

type Filter = "연락할 곳" | "늦은 곳" | "받은 곳" | "전부";

export default function DashboardPage() {
  const { ready, state, commit, toast } = useAppState();
  const [filter, setFilter] = useState<Filter>("연락할 곳");
  const [sending, setSending] = useState<ClientAccount | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveConfigured, setLiveConfigured] = useState(false);

  const stats = useMemo(() => (state ? summarize(state.clients) : null), [state]);
  const plan = state ? getPlan(state.profile.plan) : null;

  useEffect(() => {
    fetchAlimtalkStatus().then((s) => setLiveConfigured(s.configured));
  }, []);

  if (!ready || !state || !stats || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero text-sm text-ink-muted">
        불러오는 중…
      </div>
    );
  }

  const canBulk = planAllows(state.profile.plan, "bulkSend");
  const canLink = planAllows(state.profile.plan, "submitLink");
  const canReply = planAllows(state.profile.plan, "oneTapReply");
  const canSchedule = planAllows(state.profile.plan, "autoSchedule");
  const liveSend = Boolean(state.profile.liveSend);

  async function applySend(client: ClientAccount) {
    setBusy(true);
    try {
      const submit = canLink ? submitUrlFor(client.submitToken) : "";
      const reply = canReply ? replyUrlFor(client.replyToken) : "";
      const result = await requestAlimtalkSend({
        preferLive: liveSend,
        messages: [
          {
            to: client.phone,
            officeName: state!.profile.officeName,
            clientName: client.name,
            contactName: client.contactName,
            monthLabel: state!.monthLabel,
            docsLabel: client.docs.map((d) => `· ${d}`).join("\n"),
            submitUrl: submit || "사무소로 전달",
            replyUrl: reply || "사무소로 연락",
            stepLabel: sendStepLabel(client.status),
          },
        ],
      });
      if (!result.ok && result.failCount > 0 && result.liveCount === 0 && result.practiceCount === 0) {
        commit(state!, result.error || "발송 실패");
        return;
      }
      const nextStatus = nextChaseStatus(client.status);
      const mode = result.liveCount > 0 ? "실발송" : "연습";
      const next = withActivity(
        {
          ...state!,
          messagesUsed: (state!.messagesUsed || 0) + 1,
          clients: state!.clients.map((c) =>
            c.id === client.id
              ? {
                  ...c,
                  status: nextStatus,
                  lastSentAt: new Date().toISOString(),
                  submittedAt: undefined,
                  inCallQueue: nextStatus === "지연" || nextStatus === "2차발송",
                }
              : c,
          ),
        },
        `${client.name} 알림톡(${mode}) · ${statusLabel(nextStatus)}`,
      );
      commit(next, result.liveCount > 0 ? "알림톡을 보냈어요" : "연습 발송 반영");
      setSending(null);
    } finally {
      setBusy(false);
    }
  }

  function markDone(client: ClientAccount) {
    const next = withActivity(
      {
        ...state!,
        clients: state!.clients.map((c) =>
          c.id === client.id
            ? {
                ...c,
                status: "제출완료" as ChaseStatus,
                submittedAt: new Date().toISOString(),
                inCallQueue: false,
              }
            : c,
        ),
      },
      `${client.name} 자료를 받았다고 표시`,
    );
    commit(next, "자료 받았어요");
  }

  async function runBulk() {
    if (!canBulk || !state) return;
    const current = state;
    const targets = current.clients.filter((c) => !isDoneStatus(c.status) && c.phone);
    if (!targets.length) {
      commit(current, "보낼 곳이 없습니다");
      setBulkOpen(false);
      return;
    }
    setBusy(true);
    try {
      const result = await requestAlimtalkSend({
        preferLive: liveSend,
        messages: targets.map((t) => ({
          to: t.phone,
          officeName: current.profile.officeName,
          clientName: t.name,
          contactName: t.contactName,
          monthLabel: current.monthLabel,
          docsLabel: t.docs.map((d) => `· ${d}`).join("\n"),
          submitUrl: canLink ? submitUrlFor(t.submitToken) : "사무소로 전달",
          replyUrl: canReply ? replyUrlFor(t.replyToken) : "사무소로 연락",
          stepLabel: sendStepLabel(t.status),
        })),
      });
      let next = {
        ...current,
        clients: [...current.clients],
        messagesUsed: current.messagesUsed + targets.length,
      };
      targets.forEach((t) => {
        next = {
          ...next,
          clients: next.clients.map((c) => {
            if (c.id !== t.id) return c;
            const status = nextChaseStatus(c.status) as ChaseStatus;
            return {
              ...c,
              status,
              lastSentAt: new Date().toISOString(),
              inCallQueue: status === "지연" || status === "2차발송",
            };
          }),
        };
      });
      const mode = result.liveCount > 0 ? `실 ${result.liveCount}` : "연습";
      next = withActivity(next, `미제출 ${targets.length}곳 일괄 (${mode})`);
      commit(next, `${targets.length}곳 처리`);
      setBulkOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const filtered = state.clients
    .filter((c) => {
      if (filter === "연락할 곳") return !isDoneStatus(c.status);
      if (filter === "늦은 곳") return c.status === "지연";
      if (filter === "받은 곳") return isDoneStatus(c.status);
      return true;
    })
    .sort((a, b) => urgencyLabel(b).score - urgencyLabel(a).score);

  const needContact = stats.total - stats.done;
  const msgLeft = Math.max(0, plan.alimtalkIncluded - (state.messagesUsed || 0));

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <SendRequestSheet
        open={Boolean(sending)}
        client={sending}
        officeName={state.profile.officeName}
        monthLabel={state.monthLabel}
        planId={state.profile.plan}
        liveConfigured={liveConfigured}
        liveSend={liveSend}
        busy={busy}
        onClose={() => setSending(null)}
        onConfirm={() => sending && applySend(sending)}
      />

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog">
          <button type="button" className="absolute inset-0 bg-ink/45" aria-label="닫기" onClick={() => setBulkOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-paper-card p-5 shadow-soft sm:rounded-3xl">
            <h2 className="font-display text-xl font-medium text-ink">안 낸 곳에 한꺼번에?</h2>
            <p className="mt-2 text-sm text-ink-muted">번호 있는 미제출만 · 제출·원탭 링크 포함</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" className="sc-btn-primary flex-1" disabled={busy} onClick={runBulk}>
                {busy ? "보내는 중…" : "한꺼번에 보내기"}
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-pine-700">{state.monthLabel}</p>
            <PlanBadge planId={state.profile.plan} />
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                liveConfigured && liveSend ? "bg-pine-100 text-pine-800" : "bg-amber-soft text-amber-ink"
              }`}
            >
              {liveConfigured && liveSend ? "알림톡 실발송" : "연습 모드"}
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">오늘 자료 독촉</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{WEDGE_ONE_LINER}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/dashboard/calls" className="sc-btn-secondary w-full text-center sm:w-auto">
            전화 잔여 {stats.callQueue}
          </Link>
          {canBulk ? (
            <button type="button" className="sc-btn-primary w-full sm:w-auto" onClick={() => setBulkOpen(true)}>
              안 낸 곳에 한꺼번에
            </button>
          ) : (
            <div className="w-full sm:max-w-xs">
              <UpgradeHint feature="한꺼번에 보내기" need="standard" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-pine-200 bg-pine-50/80 p-4 text-sm text-pine-800 sm:col-span-2">
          <p className="font-semibold text-pine-900">어디에 보내나요?</p>
          <p className="mt-1.5 text-xs leading-relaxed sm:text-sm">{CHANNEL_HELP}</p>
        </div>
        <div className="sc-card p-4 text-sm">
          <p className="text-xs text-ink-muted">이번 달 알림톡</p>
          <p className="mt-1 font-display text-2xl text-ink">
            {state.messagesUsed}
            <span className="text-sm font-sans text-ink-muted"> / {plan.alimtalkIncluded}</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">남음 약 {msgLeft}건 · 초과 {plan.overagePerMsgWon}원</p>
        </div>
      </div>

      {canSchedule ? (
        <p className="mt-3 text-xs text-ink-muted">
          자동 독촉: {state.schedule.enabled ? "켜짐" : "꺼짐"} ·{" "}
          <Link href="/dashboard/settings" className="font-semibold text-pine-700">
            설정
          </Link>
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "거래처", value: `${stats.total}/${plan.clientsLimit}` },
          { label: "마감 닫힘", value: stats.done },
          { label: "연락할 곳", value: needContact },
          { label: "파일 도착", value: stats.withFiles },
          { label: "전화 잔여", value: stats.callQueue },
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
        <span className="ml-auto self-center text-xs text-ink-muted">회수율 {stats.rate}%</span>
      </div>

      <ul className="mt-4 space-y-3 md:hidden">
        {filtered.map((c) => (
          <li key={c.id} className="sc-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted">
                  {c.contactName} · {c.phone || "번호 없음"} · {urgencyLabel(c).label}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(c.status)}`}>
                {statusLabel(c.status)}
              </span>
            </div>
            {(c.files?.length || 0) > 0 ? (
              <p className="mt-2 text-xs text-pine-700">파일 {c.files.length}개</p>
            ) : null}
            {c.clientReply ? <p className="mt-1 text-xs text-pine-700">원탭: {c.clientReply}</p> : null}
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                className="sc-btn-primary text-xs"
                onClick={() => setSending(c)}
                disabled={isDoneStatus(c.status) || busy}
              >
                자료 요청하기
              </button>
              <div className="flex gap-2">
                <button type="button" className="sc-btn-secondary flex-1 text-xs" onClick={() => markDone(c)}>
                  자료 받았어요
                </button>
                {canLink ? (
                  <a
                    href={submitUrlFor(c.submitToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-btn-secondary flex-1 text-xs"
                  >
                    제출
                  </a>
                ) : null}
                {canReply ? (
                  <a
                    href={replyUrlFor(c.replyToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-btn-secondary flex-1 text-xs"
                  >
                    원탭
                  </a>
                ) : null}
              </div>
            </div>
            {(c.files?.length || 0) > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-paper-line pt-2">
                {c.files.map((f) => (
                  <li key={f.id} className="truncate text-xs text-ink-muted">
                    · {f.name} ({formatBytes(f.size)})
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 hidden overflow-hidden sc-card md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper/80 text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">거래처</th>
                <th className="px-4 py-3 font-semibold">긴급</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">알림톡 번호</th>
                <th className="px-4 py-3 font-semibold">파일/회신</th>
                <th className="px-4 py-3 font-semibold">할 일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-muted">{c.contactName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-ink-muted">{urgencyLabel(c).label}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {(c.files?.length || 0) > 0 ? `${c.files.length}파일` : "—"}
                    {c.clientReply ? ` · ${c.clientReply}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-pine-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        onClick={() => setSending(c)}
                        disabled={isDoneStatus(c.status) || busy}
                      >
                        자료 요청하기
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-paper-line bg-white px-2.5 py-1.5 text-xs font-semibold"
                        onClick={() => markDone(c)}
                      >
                        자료 받았어요
                      </button>
                      {canLink ? (
                        <a
                          href={submitUrlFor(c.submitToken)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-pine-200 bg-pine-50 px-2.5 py-1.5 text-xs font-semibold text-pine-800"
                        >
                          제출
                        </a>
                      ) : null}
                      {canReply ? (
                        <a
                          href={replyUrlFor(c.replyToken)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-pine-200 bg-pine-50 px-2.5 py-1.5 text-xs font-semibold text-pine-800"
                        >
                          원탭
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 sc-card p-4">
        <h2 className="text-sm font-semibold text-ink">방금 한 일</h2>
        <ul className="mt-3 space-y-2">
          {(state.activity || []).slice(0, 8).map((a) => (
            <li key={a.id} className="flex gap-3 text-sm text-ink-muted">
              <span className="shrink-0 text-xs">{formatWhen(a.at)}</span>
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
