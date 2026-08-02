"use client";

import { useEffect, useState } from "react";
import { DashboardShell, Toast } from "@/components/SiteChrome";
import { PLANS, getPlan, type PlanId } from "@/lib/plans";
import { resetState, withActivity } from "@/lib/store";
import { claimAmount } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

export default function SettingsPage() {
  const { ready, state, commit, toast } = useAppState();
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    if (!state) return;
    setCompanyName(state.profile.companyName);
    setOwnerName(state.profile.ownerName);
  }, [state]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    commit(
      withActivity(
        {
          ...state!,
          profile: {
            ...state!.profile,
            companyName: companyName.trim() || state!.profile.companyName,
            ownerName: ownerName.trim() || state!.profile.ownerName,
          },
        },
        "회사 정보 저장",
      ),
      "저장했습니다",
    );
  }

  function changePlan(id: PlanId) {
    commit(
      withActivity({ ...state!, profile: { ...state!.profile, plan: id } }, `${getPlan(id).name}로 변경`),
      `${getPlan(id).name}로 바꿨어요`,
    );
  }

  function reset() {
    if (!confirm("데모를 초기화할까요?")) return;
    const fresh = resetState(state!.profile.plan);
    commit(fresh, "초기화됨");
    setCompanyName(fresh.profile.companyName);
    setOwnerName(fresh.profile.ownerName);
  }

  function exportCsv() {
    const rows = [
      "현장,기성번호,기간,제목,상태,청구액,유보,승인자",
      ...state!.apps.map((o) => {
        const p = state!.projects.find((x) => x.id === o.projectId);
        return `"${p?.name || ""}",${o.number},${o.period},"${o.title}",${o.status},${claimAmount(o)},${o.retainageWon},"${p?.approverName || ""}"`;
      }),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "기성확정_기성대장.csv";
    a.click();
    URL.revokeObjectURL(url);
    commit(withActivity(state!, "기성대장 CSV 다운로드"), "CSV 저장");
  }

  return (
    <DashboardShell companyName={state.profile.companyName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">설정</h1>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">플랜</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => changePlan(p.id)}
              className={`rounded-2xl border p-4 text-left ${
                state.profile.plan === p.id ? "border-steel-600 bg-steel-50" : "border-paper-line bg-paper-card"
              }`}
            >
              <p className="text-sm font-semibold text-steel-700">{p.name}</p>
              <p className="mt-1 font-display text-xl">{p.priceLabel}원</p>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={save} className="mt-8 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">회사</h2>
        <label className="sc-label mt-4" htmlFor="co">
          상호
        </label>
        <input id="co" className="sc-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <label className="sc-label mt-4" htmlFor="owner">
          담당자
        </label>
        <input id="owner" className="sc-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <button type="submit" className="sc-btn-primary mt-5">
          저장
        </button>
      </form>

      <div className="mt-6 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">기성대장 CSV</h2>
        <button type="button" className="sc-btn-secondary mt-4" onClick={exportCsv}>
          내려받기
        </button>
      </div>

      <div className="mt-6 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">데모 초기화</h2>
        <button type="button" className="sc-btn-secondary mt-4" onClick={reset}>
          초기화
        </button>
      </div>
    </DashboardShell>
  );
}
