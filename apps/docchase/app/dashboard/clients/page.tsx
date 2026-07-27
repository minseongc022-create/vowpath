"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { PlanBadge, UpgradeHint } from "@/components/PlanUI";
import { Toast } from "@/components/Toast";
import { CHANNEL_HELP, statusClass, statusLabel } from "@/lib/format";
import { getPlan } from "@/lib/plans";
import { replyUrlFor, submitUrlFor, withActivity } from "@/lib/store";
import type { ClientAccount, DocKind } from "@/lib/types";
import { DOC_KINDS, newReplyToken, newSubmitToken } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

export default function ClientsPage() {
  const { ready, state, commit, toast } = useAppState();
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    deadlineDay: "10",
    docs: ["통장사본", "카드매출"] as DocKind[],
  });

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const plan = getPlan(state.profile.plan);
  const atLimit = state.clients.length >= plan.clientsLimit;

  function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit) {
      commit(state!, `거래처는 ${plan.name}에서 ${plan.clientsLimit}곳까지입니다`);
      return;
    }
    if (!form.name.trim()) return;
    if (!form.phone.replace(/\D/g, "")) {
      commit(state!, "알림톡을 받으려면 휴대폰 번호가 필요합니다");
      return;
    }
    const client: ClientAccount = {
      id: `c_${Date.now()}`,
      name: form.name.trim(),
      contactName: form.contactName.trim() || "담당자",
      phone: form.phone.trim(),
      deadlineDay: Math.min(28, Math.max(1, Number(form.deadlineDay) || 10)),
      docs: form.docs.length ? form.docs : ["통장사본"],
      status: "대기",
      submitToken: newSubmitToken(),
      replyToken: newReplyToken(),
      files: [],
      assignee: state!.profile.ownerName,
    };
    const next = withActivity(
      { ...state!, clients: [client, ...state!.clients] },
      `${client.name} 추가 · ${client.phone}`,
    );
    commit(next, "거래처를 넣었어요");
    setForm({ name: "", contactName: "", phone: "", deadlineDay: "10", docs: ["통장사본", "카드매출"] });
  }

  function toggleDoc(kind: DocKind) {
    setForm((f) => ({
      ...f,
      docs: f.docs.includes(kind) ? f.docs.filter((d) => d !== kind) : [...f.docs, kind],
    }));
  }

  function removeClient(id: string, name: string) {
    if (!window.confirm(`${name}을(를) 뺄까요?`)) return;
    const next = withActivity(
      { ...state!, clients: state!.clients.filter((c) => c.id !== id) },
      `${name} 삭제`,
    );
    commit(next, "삭제했어요");
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">거래처</h1>
        <PlanBadge planId={state.profile.plan} />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        휴대폰 번호 = 알림톡 도착 주소. {plan.name}: 최대 {plan.clientsLimit}곳 (
        {state.clients.length}/{plan.clientsLimit})
      </p>
      <p className="mt-3 rounded-xl border border-pine-200 bg-pine-50/70 px-3 py-2.5 text-xs text-pine-800">
        {CHANNEL_HELP}
      </p>

      {atLimit ? (
        <div className="mt-4">
          <UpgradeHint feature="거래처 추가" need={plan.id === "lite" ? "standard" : "pro"} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={addClient} className="sc-card h-fit p-5">
          <h2 className="text-sm font-semibold text-ink">거래처 추가</h2>
          <label className="sc-label mt-4" htmlFor="name">
            상호
          </label>
          <input
            id="name"
            className="sc-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="contact">
            담당자
          </label>
          <input
            id="contact"
            className="sc-input"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="phone">
            알림톡 받을 휴대폰
          </label>
          <input
            id="phone"
            className="sc-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="010-0000-0000"
            inputMode="tel"
            required
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="day">
            매월 마감일
          </label>
          <input
            id="day"
            className="sc-input"
            value={form.deadlineDay}
            onChange={(e) => setForm({ ...form, deadlineDay: e.target.value })}
            disabled={atLimit}
          />
          <p className="sc-label mt-3">받을 자료</p>
          <div className="flex flex-wrap gap-2">
            {DOC_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleDoc(k)}
                disabled={atLimit}
                className={`min-h-9 rounded-full px-3 py-1 text-xs font-semibold ${
                  form.docs.includes(k) ? "bg-ink text-paper" : "border border-paper-line bg-white text-ink-muted"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <button type="submit" className="sc-btn-primary mt-5 w-full" disabled={atLimit}>
            거래처에 넣기
          </button>
        </form>

        <div className="sc-card overflow-hidden">
          <ul className="divide-y divide-paper-line">
            {state.clients.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-muted">
                    {c.contactName} · {c.phone}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    매월 {c.deadlineDay}일 · {c.docs.join(" · ")}
                  </p>
                  {plan.flags.submitLink ? (
                    <a
                      href={submitUrlFor(c.submitToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-pine-700"
                    >
                      제출 링크
                    </a>
                  ) : null}
                  {plan.flags.oneTapReply ? (
                    <a
                      href={replyUrlFor(c.replyToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 ml-2 inline-block text-xs font-semibold text-pine-700"
                    >
                      원탭 회신
                    </a>
                  ) : null}
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-ink"
                  onClick={() => removeClient(c.id, c.name)}
                >
                  빼기
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}
