"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { UpgradeHint } from "@/components/PlanUI";
import { Toast } from "@/components/Toast";
import { getPlan } from "@/lib/plans";
import { parseClientsCsv, withActivity } from "@/lib/store";
import type { ClientAccount } from "@/lib/types";
import { newSubmitToken } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

const SAMPLE = `상호,담당자,연락처,필요자료,마감일
샘플식당,홍길동,010-1111-2222,통장사본|카드매출|세금계산서,8
샘플클리닉,김영희,010-3333-4444,통장사본|현금영수증,10`;

export default function ImportPage() {
  const { ready, state, commit, toast, flash } = useAppState();
  const [csv, setCsv] = useState(SAMPLE);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const plan = getPlan(state.profile.plan);
  const room = Math.max(0, plan.clientsLimit - state.clients.length);

  function onImport(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseClientsCsv(csv);
    if (!parsed.length) {
      flash("가져올 줄이 없습니다");
      return;
    }
    const sliced = parsed.slice(0, room);
    if (!sliced.length) {
      flash(`거래처 한도(${plan.clientsLimit})에 도달했습니다`);
      return;
    }
    const clients: ClientAccount[] = sliced.map((row, i) => ({
      ...row,
      id: `imp_${Date.now()}_${i}`,
      status: "대기",
      submitToken: newSubmitToken(),
      files: [],
    }));
    const next = withActivity(
      { ...state!, clients: [...clients, ...state!.clients] },
      `명단 ${clients.length}곳 추가`,
    );
    commit(
      next,
      parsed.length > sliced.length
        ? `${clients.length}곳만 넣었어요 (한도)`
        : `${clients.length}곳을 넣었어요`,
    );
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">명단 넣기</h1>
      <p className="mt-2 text-sm text-ink-muted">
        CSV 붙여넣기 · 연락처 = 알림톡 휴대폰 · 남은 자리 {room}곳 ({plan.name})
      </p>
      {room === 0 ? (
        <div className="mt-4">
          <UpgradeHint feature="명단 추가" need={plan.id === "lite" ? "standard" : "pro"} />
        </div>
      ) : null}

      <form onSubmit={onImport} className="mt-8 sc-card p-5">
        <textarea
          className="sc-input min-h-[220px] font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          disabled={room === 0}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="sc-btn-primary" disabled={room === 0}>
            거래처에 넣기
          </button>
          <button type="button" className="sc-btn-secondary" onClick={() => setCsv(SAMPLE)}>
            예시 다시 보기
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
