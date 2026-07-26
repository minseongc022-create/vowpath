"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { statusClass } from "@/lib/format";
import { loadState, saveState } from "@/lib/store";
import type { AppState, ClientAccount, DocKind } from "@/lib/types";
import { DOC_KINDS } from "@/lib/types";

export default function ClientsPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    deadlineDay: "10",
    docs: ["통장사본", "카드매출"] as DocKind[],
  });

  useEffect(() => {
    if (!window.localStorage.getItem("suimcheck.session")) {
      router.replace("/login");
      return;
    }
    setState(loadState());
  }, [router]);

  if (!state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  function addClient(e: React.FormEvent) {
    e.preventDefault();
    const client: ClientAccount = {
      id: `c_${Date.now()}`,
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      deadlineDay: Math.min(28, Math.max(1, Number(form.deadlineDay) || 10)),
      docs: form.docs,
      status: "대기",
    };
    const next = { ...state!, clients: [client, ...state!.clients] };
    saveState(next);
    setState(next);
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

  function removeClient(id: string) {
    const next = { ...state!, clients: state!.clients.filter((c) => c.id !== id) };
    saveState(next);
    setState(next);
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <h1 className="font-display text-3xl font-semibold text-ink">수임처</h1>
      <p className="mt-2 text-sm text-ink-muted">
        요청 대상과 받을 자료를 관리합니다. 기장 프로그램과 별도로 둡니다.
      </p>

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
            required
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
            required
          />
          <label className="sc-label mt-3" htmlFor="day">
            매월 마감일
          </label>
          <input
            id="day"
            className="sc-input"
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
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  form.docs.includes(k)
                    ? "bg-ink text-paper"
                    : "border border-paper-line bg-white text-ink-muted"
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
          <ul className="divide-y divide-paper-line">
            {state.clients.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-muted">
                    {c.contactName} · {c.phone} · 매월 {c.deadlineDay}일
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{c.docs.join(" · ")}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-ink hover:underline"
                  onClick={() => removeClient(c.id)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}
