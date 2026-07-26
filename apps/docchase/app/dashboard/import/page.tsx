"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { parseClientsCsv, withActivity } from "@/lib/store";
import type { ClientAccount } from "@/lib/types";
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

  function onImport(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseClientsCsv(csv);
    if (!parsed.length) {
      flash("가져올 줄이 없습니다. 첫 줄은 제목, 아래는 데이터여야 합니다.");
      return;
    }
    const clients: ClientAccount[] = parsed.map((row, i) => ({
      ...row,
      id: `imp_${Date.now()}_${i}`,
      status: "대기",
    }));
    const next = withActivity(
      { ...state!, clients: [...clients, ...state!.clients] },
      `명단 ${clients.length}곳을 거래처에 넣었습니다`,
    );
    commit(next, `${clients.length}곳을 넣었어요`);
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">명단 넣기</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
        엑셀에 있던 거래처 명단을 CSV로 저장한 뒤 붙여 넣으면 됩니다.{" "}
        <strong className="font-semibold text-ink">연락처 칸 = 알림톡 받을 휴대폰</strong>입니다.
      </p>

      <form onSubmit={onImport} className="mt-8 sc-card p-5">
        <label className="sc-label" htmlFor="csv">
          엑셀에서 복사한 CSV
        </label>
        <textarea
          id="csv"
          className="sc-input min-h-[220px] font-mono text-xs leading-relaxed"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <p className="mt-2 text-xs text-ink-muted">
          제목 줄 예: 상호,담당자,연락처,필요자료,마감일 · 필요자료는{" "}
          <code className="rounded bg-white px-1">통장사본|카드매출</code>처럼 | 로 구분
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="sc-btn-primary">
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
