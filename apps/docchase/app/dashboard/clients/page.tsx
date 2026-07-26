"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { CHANNEL_HELP, statusClass, statusLabel } from "@/lib/format";
import { withActivity } from "@/lib/store";
import type { ClientAccount, DocKind } from "@/lib/types";
import { DOC_KINDS } from "@/lib/types";
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

  function addClient(e: React.FormEvent) {
    e.preventDefault();
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
    };
    const next = withActivity(
      { ...state!, clients: [client, ...state!.clients] },
      `${client.name}을(를) 거래처에 넣었습니다 · 알림톡 ${client.phone}`,
    );
    commit(next, "거래처를 추가했어요");
    setForm({
      name: "",
      contactName: "",
      phone: "",
      deadlineDay: "10",
      docs: ["통장사본", "카드매출"],
    });
  }

  function toggleDoc(kind: DocKind) {
    setForm((f) => ({
      ...f,
      docs: f.docs.includes(kind) ? f.docs.filter((d) => d !== kind) : [...f.docs, kind],
    }));
  }

  function removeClient(id: string, name: string) {
    if (!window.confirm(`${name}을(를) 목록에서 뺄까요?`)) return;
    const next = withActivity(
      { ...state!, clients: state!.clients.filter((c) => c.id !== id) },
      `${name}을(를) 뺐습니다`,
    );
    commit(next, "삭제했어요");
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">거래처</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
        기장 맡긴 가게·회사 명단입니다. <strong className="font-semibold text-ink">휴대폰 번호</strong>가
        곧 알림톡 도착 주소입니다.
      </p>
      <p className="mt-3 rounded-xl border border-pine-200 bg-pine-50/70 px-3 py-2.5 text-xs leading-relaxed text-pine-800">
        {CHANNEL_HELP}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={addClient} className="sc-card h-fit p-5">
          <h2 className="text-sm font-semibold text-ink">거래처 추가</h2>
          <label className="sc-label mt-4" htmlFor="name">
            상호 (가게·회사 이름)
          </label>
          <input
            id="name"
            className="sc-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="예: 한빛카페 성수점"
            required
          />
          <label className="sc-label mt-3" htmlFor="contact">
            담당자 이름
          </label>
          <input
            id="contact"
            className="sc-input"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            placeholder="예: 김민지"
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
          />
          <p className="mt-1.5 text-xs text-ink-muted">이 번호의 카카오톡으로 자료 요청이 갑니다.</p>
          <label className="sc-label mt-3" htmlFor="day">
            매월 자료 마감일
          </label>
          <input
            id="day"
            className="sc-input"
            inputMode="numeric"
            value={form.deadlineDay}
            onChange={(e) => setForm({ ...form, deadlineDay: e.target.value })}
          />
          <p className="sc-label mt-3">이번 달에 받을 자료</p>
          <div className="flex flex-wrap gap-2">
            {DOC_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleDoc(k)}
                className={`min-h-9 rounded-full px-3 py-1 text-xs font-semibold ${
                  form.docs.includes(k) ? "bg-ink text-paper" : "border border-paper-line bg-white text-ink-muted"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <button type="submit" className="sc-btn-primary mt-5 w-full">
            거래처에 넣기
          </button>
        </form>

        <div className="sc-card overflow-hidden">
          {state.clients.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">아직 거래처가 없습니다. 왼쪽에서 넣어 주세요.</p>
          ) : (
            <ul className="divide-y divide-paper-line">
              {state.clients.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-muted">
                      {c.contactName} · <span className="font-medium text-ink">{c.phone || "번호 없음"}</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      매월 {c.deadlineDay}일 · {c.docs.join(" · ")}
                    </p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="min-h-9 text-xs font-semibold text-rose-ink hover:underline"
                    onClick={() => removeClient(c.id, c.name)}
                  >
                    빼기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
