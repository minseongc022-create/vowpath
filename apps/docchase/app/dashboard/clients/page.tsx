"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { statusClass } from "@/lib/format";
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
      `${client.name} 수임처를 추가했습니다`,
    );
    commit(next, `${client.name}을(를) 추가했습니다`);
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
    if (!window.confirm(`${name}을(를) 삭제할까요?`)) return;
    const next = withActivity(
      { ...state!, clients: state!.clients.filter((c) => c.id !== id) },
      `${name} 수임처를 삭제했습니다`,
    );
    commit(next, "삭제했습니다");
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">수임처</h1>
      <p className="mt-2 text-sm text-ink-muted">요청 대상과 받을 자료를 관리합니다.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={addClient} className="sc-card h-fit p-5">
          <h2 className="text-sm font-semibold text-ink">수임처 추가</h2>
          <label className="sc-label mt-4" htmlFor="name">
            상호
          </label>
          <input
            id="name"
            className="sc-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label className="sc-label mt-3" htmlFor="contact">
            담당자
          </label>
          <input
            id="contact"
            className="sc-input"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
          <label className="sc-label mt-3" htmlFor="phone">
            연락처
          </label>
          <input
            id="phone"
            className="sc-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="010-0000-0000"
          />
          <label className="sc-label mt-3" htmlFor="day">
            매월 마감일
          </label>
          <input
            id="day"
            className="sc-input"
            inputMode="numeric"
            value={form.deadlineDay}
            onChange={(e) => setForm({ ...form, deadlineDay: e.target.value })}
          />
          <p className="sc-label mt-3">필요 자료</p>
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
            추가
          </button>
        </form>

        <div className="sc-card overflow-hidden">
          {state.clients.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">등록된 수임처가 없습니다. 왼쪽에서 추가하세요.</p>
          ) : (
            <ul className="divide-y divide-paper-line">
              {state.clients.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-muted">
                      {c.contactName} · {c.phone || "연락처 없음"} · 매월 {c.deadlineDay}일
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{c.docs.join(" · ")}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="min-h-9 text-xs font-semibold text-rose-ink hover:underline"
                    onClick={() => removeClient(c.id, c.name)}
                  >
                    삭제
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
