"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { loadState, parseClientsCsv, saveState } from "@/lib/store";
import type { AppState, ClientAccount } from "@/lib/types";

const SAMPLE = `상호,담당자,연락처,필요자료,마감일
샘플식당,홍길동,010-1111-2222,통장사본|카드매출|세금계산서,8
샘플클리닉,김영희,010-3333-4444,통장사본|현금영수증,10`;

export default function ImportPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [csv, setCsv] = useState(SAMPLE);
  const [message, setMessage] = useState("");

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

  function onImport(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseClientsCsv(csv);
    if (!parsed.length) {
      setMessage("가져올 행이 없습니다. 헤더와 데이터를 확인해 주세요.");
      return;
    }
    const clients: ClientAccount[] = parsed.map((row, i) => ({
      ...row,
      id: `imp_${Date.now()}_${i}`,
      status: "대기",
    }));
    const next = { ...state!, clients: [...clients, ...state!.clients] };
    saveState(next);
    setState(next);
    setMessage(`${clients.length}곳을 수임처에 추가했습니다.`);
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <h1 className="font-display text-3xl font-semibold text-ink">CSV 가져오기</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        엑셀에서 CSV로 저장한 수임처 목록을 붙여 넣습니다. 필요자료는{" "}
        <code className="rounded bg-white px-1 text-xs">|</code> 로 구분합니다.
      </p>

      <form onSubmit={onImport} className="mt-8 sc-card p-5">
        <label className="sc-label" htmlFor="csv">
          CSV 내용
        </label>
        <textarea
          id="csv"
          className="sc-input min-h-[220px] font-mono text-xs leading-relaxed"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="sc-btn-primary">
            수임처에 추가
          </button>
          <button
            type="button"
            className="sc-btn-secondary"
            onClick={() => setCsv(SAMPLE)}
          >
            예시로 되돌리기
          </button>
          {message ? <p className="text-sm font-medium text-pine-700">{message}</p> : null}
        </div>
      </form>
    </DashboardShell>
  );
}
