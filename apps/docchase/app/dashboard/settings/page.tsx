"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { resetDemoState, withActivity } from "@/lib/store";
import { useAppState } from "@/lib/useAppState";

export default function SettingsPage() {
  const { ready, state, commit, toast } = useAppState();
  const [officeName, setOfficeName] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    if (!state) return;
    setOfficeName(state.profile.officeName);
    setOwnerName(state.profile.ownerName);
  }, [state]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

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

  function resetAll() {
    if (!window.confirm("데모 데이터를 처음 상태로 되돌릴까요?")) return;
    const fresh = resetDemoState();
    commit(fresh, "데모를 초기화했습니다");
    setOfficeName(fresh.profile.officeName);
    setOwnerName(fresh.profile.ownerName);
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">설정</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
        사무소 이름(알림톡 제목에 표시)과 연습 데이터를 관리합니다. 실제 발송은 솔라피·카카오 채널
        연동 후 같은 「자료 요청하기」 버튼으로 나갑니다.
      </p>

      <form onSubmit={saveProfile} className="mt-8 max-w-lg sc-card p-5">
        <label className="sc-label" htmlFor="office">
          사무소명
        </label>
        <input
          id="office"
          className="sc-input"
          value={officeName}
          onChange={(e) => setOfficeName(e.target.value)}
        />
        <label className="sc-label mt-4" htmlFor="owner">
          담당자
        </label>
        <input
          id="owner"
          className="sc-input"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />
        <p className="mt-3 text-xs text-ink-muted">요금제: 스탠다드 (데모)</p>
        <button type="submit" className="sc-btn-primary mt-5 w-full sm:w-auto">
          저장
        </button>
      </form>

      <div className="mt-6 max-w-lg sc-card p-5">
        <h2 className="text-sm font-semibold text-ink">데모 초기화</h2>
        <p className="mt-2 text-sm text-ink-muted">수임처·활동 기록을 샘플 데이터로 되돌립니다.</p>
        <button type="button" className="sc-btn-secondary mt-4" onClick={resetAll}>
          데모 데이터 초기화
        </button>
      </div>
    </DashboardShell>
  );
}
