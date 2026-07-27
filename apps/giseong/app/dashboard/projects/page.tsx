"use client";

import Link from "next/link";
import { useState } from "react";
import { DashboardShell, Toast } from "@/components/SiteChrome";
import { getPlan } from "@/lib/plans";
import { withActivity } from "@/lib/store";
import { formatWon, type Project } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

export default function ProjectsPage() {
  const { ready, state, commit, toast } = useAppState();
  const [form, setForm] = useState({
    name: "",
    approverName: "",
    phone: "",
    address: "",
    contract: "200000000",
  });

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const plan = getPlan(state.profile.plan);
  const atLimit = state.projects.length >= plan.projectsLimit;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit) {
      commit(state!, `현장은 ${plan.projectsLimit}곳까지`);
      return;
    }
    const project: Project = {
      id: `p_${Date.now()}`,
      name: form.name.trim(),
      approverName: form.approverName.trim() || "원청 담당",
      phone: form.phone.trim(),
      address: form.address.trim(),
      contractWon: Number(form.contract) || 0,
      createdAt: new Date().toISOString(),
    };
    commit(
      withActivity({ ...state!, projects: [project, ...state!.projects] }, `${project.name} 현장 추가`),
      "현장을 넣었어요",
    );
    setForm({ name: "", approverName: "", phone: "", address: "", contract: "200000000" });
  }

  return (
    <DashboardShell companyName={state.profile.companyName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">현장</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {plan.name}: {state.projects.length}/{plan.projectsLimit}곳
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={add} className="sc-card h-fit p-5">
          <h2 className="text-sm font-semibold text-ink">현장 추가</h2>
          <label className="sc-label mt-4" htmlFor="name">
            현장명
          </label>
          <input
            id="name"
            className="sc-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="approver">
            승인자 (원청·발주)
          </label>
          <input
            id="approver"
            className="sc-input"
            value={form.approverName}
            onChange={(e) => setForm({ ...form, approverName: e.target.value })}
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="phone">
            휴대폰 (승인 링크용)
          </label>
          <input
            id="phone"
            className="sc-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="addr">
            주소
          </label>
          <input
            id="addr"
            className="sc-input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            disabled={atLimit}
          />
          <label className="sc-label mt-3" htmlFor="contract">
            계약 금액
          </label>
          <input
            id="contract"
            className="sc-input"
            value={form.contract}
            onChange={(e) => setForm({ ...form, contract: e.target.value })}
            disabled={atLimit}
          />
          <button type="submit" className="sc-btn-primary mt-5 w-full" disabled={atLimit}>
            현장 넣기
          </button>
        </form>

        <ul className="sc-card divide-y divide-paper-line overflow-hidden">
          {state.projects.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="font-medium text-ink">{p.name}</p>
              <p className="text-xs text-ink-muted">
                {p.approverName} · {p.phone} · {formatWon(p.contractWon)}
              </p>
              <p className="text-xs text-ink-muted">{p.address}</p>
              <Link
                href={`/dashboard/new?project=${p.id}`}
                className="mt-2 inline-block text-xs font-semibold text-steel-700"
              >
                이 현장에 기성 만들기 →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
