"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { getPlan, PLANS, planMsgCogsWon, type PlanId } from "@/lib/plans";
import { fetchAlimtalkStatus } from "@/lib/sendClient";
import { exportClientsCsv, resetDemoState, runAutoChasePass, withActivity } from "@/lib/store";
import { useAppState } from "@/lib/useAppState";

export default function SettingsPage() {
  const { ready, state, commit, toast } = useAppState();
  const [officeName, setOfficeName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [alim, setAlim] = useState<{
    configured: boolean;
    fromMasked: string | null;
    smsFailover: boolean;
  } | null>(null);

  useEffect(() => {
    if (!state) return;
    setOfficeName(state.profile.officeName);
    setOwnerName(state.profile.ownerName);
  }, [state]);

  useEffect(() => {
    fetchAlimtalkStatus().then(setAlim);
  }, []);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const plan = getPlan(state.profile.plan);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const next = withActivity(
      {
        ...state!,
        profile: {
          ...state!.profile,
          officeName: officeName.trim() || state!.profile.officeName,
          ownerName: ownerName.trim() || state!.profile.ownerName,
        },
      },
      "사무소 정보를 저장했습니다",
    );
    commit(next, "저장했습니다");
  }

  function changePlan(id: PlanId) {
    const p = getPlan(id);
    const next = withActivity(
      {
        ...state!,
        profile: { ...state!.profile, plan: id },
        schedule: {
          ...state!.schedule,
          enabled: p.flags.autoSchedule ? state!.schedule.enabled || true : false,
        },
      },
      `${p.name} 플랜으로 변경`,
    );
    commit(next, `${p.name}로 바꿨어요`);
  }

  function toggleLiveSend() {
    if (!state) return;
    if (!alim?.configured && !state.profile.liveSend) {
      commit(state, "서버에 솔라피 환경변수를 먼저 넣어야 실발송이 됩니다");
      return;
    }
    const next = {
      ...state,
      profile: { ...state.profile, liveSend: !state.profile.liveSend },
    };
    commit(
      withActivity(next, `실발송 ${next.profile.liveSend ? "켜짐" : "꺼짐"}`),
      next.profile.liveSend ? "실발송 ON" : "연습 모드",
    );
  }

  function toggleSchedule() {
    if (!state || !getPlan(state.profile.plan).flags.autoSchedule) return;
    const next = {
      ...state,
      schedule: { ...state.schedule, enabled: !state.schedule.enabled },
    };
    commit(withActivity(next, `자동 독촉 ${next.schedule.enabled ? "켜짐" : "꺼짐"}`), "스케줄 저장");
  }

  function runAutoNow() {
    if (!state || !plan.flags.autoSchedule) return;
    const next = runAutoChasePass({ ...state, schedule: { ...state.schedule, enabled: true } });
    commit(next, "자동 독촉을 한 번 돌렸어요");
  }

  function downloadReport() {
    if (!state || !plan.flags.exportReport) return;
    const csv = exportClientsCsv(state);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `수임체크_${state.monthLabel.replace(/\s/g, "")}_회수.csv`;
    a.click();
    URL.revokeObjectURL(url);
    commit(withActivity(state, "회수율 CSV를 내려받았습니다"), "CSV 저장");
  }

  function resetAll() {
    if (!state) return;
    if (!window.confirm("데모를 처음 상태로 되돌릴까요?")) return;
    const fresh = resetDemoState(state.profile.plan);
    commit(fresh, "데모를 초기화했습니다");
    setOfficeName(fresh.profile.officeName);
    setOwnerName(fresh.profile.ownerName);
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">설정</h1>
      <p className="mt-2 text-sm text-ink-muted">알림톡(솔라피)·플랜·자동 독촉을 관리합니다.</p>

      <section className="mt-8 sc-card max-w-lg p-5">
        <h2 className="text-sm font-semibold text-ink">카카오 알림톡 (솔라피)</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {alim == null
            ? "상태 확인 중…"
            : alim.configured
              ? `연동됨 · 발신 ${alim.fromMasked}${alim.smsFailover ? " · SMS 대체 ON" : ""}`
              : "서버 환경변수 없음 → 연습 모드만 동작"}
        </p>
        <button type="button" className="sc-btn-secondary mt-4" onClick={toggleLiveSend}>
          실발송 지금 {state.profile.liveSend ? "켜짐 — 끄기" : "꺼짐 — 켜기"}
        </button>
        <p className="mt-3 text-xs text-ink-muted">
          키 넣는 법: <code className="rounded bg-paper px-1">apps/docchase/docs/ALIMTALK_SETUP.md</code>
        </p>
      </section>

      <section id="plan" className="mt-8 scroll-mt-24">
        <h2 className="text-sm font-semibold text-ink">플랜</h2>
        <p className="mt-1 text-xs text-ink-muted">
          지금: {plan.name} · {plan.priceLabel}원 · 알림 {plan.alimtalkIncluded}건 (원가 약{" "}
          {planMsgCogsWon(plan).toLocaleString("ko-KR")}원) → 구독 마진이 대부분
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => changePlan(p.id)}
              className={`rounded-2xl border p-4 text-left ${
                state.profile.plan === p.id
                  ? "border-pine-600 bg-pine-50"
                  : "border-paper-line bg-paper-card hover:border-pine-300"
              }`}
            >
              <p className="text-sm font-semibold text-pine-700">{p.name}</p>
              <p className="mt-1 font-display text-xl">{p.priceLabel}원</p>
              <p className="mt-1 text-xs text-ink-muted">{p.audience}</p>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={saveProfile} className="mt-8 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">사무소</h2>
        <label className="sc-label mt-4" htmlFor="office">
          사무소명
        </label>
        <input id="office" className="sc-input" value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
        <label className="sc-label mt-4" htmlFor="owner">
          담당자
        </label>
        <input id="owner" className="sc-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <button type="submit" className="sc-btn-primary mt-5 w-full sm:w-auto">
          저장
        </button>
      </form>

      <div className="mt-6 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">자동 독촉 (D-7 / D-3 / D-1)</h2>
        {plan.flags.autoSchedule ? (
          <>
            <p className="mt-2 text-sm text-ink-muted">마감일 기준 미제출만 자동 요청합니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="sc-btn-secondary" onClick={toggleSchedule}>
                지금 {state.schedule.enabled ? "켜짐 — 끄기" : "꺼짐 — 켜기"}
              </button>
              <button type="button" className="sc-btn-primary" onClick={runAutoNow}>
                지금 한 번 돌리기
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-amber-ink">스탠다드 이상</p>
        )}
      </div>

      <div className="mt-6 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">회수율 리포트</h2>
        {plan.flags.exportReport ? (
          <>
            <p className="mt-2 text-sm text-ink-muted">거래처·전화큐·파일 수 CSV</p>
            <button type="button" className="sc-btn-secondary mt-4" onClick={downloadReport}>
              CSV 내려받기
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-amber-ink">스탠다드 이상</p>
        )}
      </div>

      <div className="mt-6 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">데모 초기화</h2>
        <button type="button" className="sc-btn-secondary mt-4" onClick={resetAll}>
          데모 데이터 초기화
        </button>
      </div>
    </DashboardShell>
  );
}
