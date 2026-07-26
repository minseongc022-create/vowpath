"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { alimtalkPreview } from "@/lib/format";
import { useAppState } from "@/lib/useAppState";

export default function TemplatesPage() {
  const { ready, state, toast, flash } = useAppState();

  const sample = useMemo(() => {
    if (!state) return "";
    const c = state.clients.find((x) => x.status !== "제출완료") || state.clients[0];
    return alimtalkPreview(
      state.profile.officeName,
      c?.name || "거래처",
      c?.docs || ["통장사본", "카드매출"],
      state.monthLabel,
    );
  }, [state]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(sample);
      flash("미리보기 문구를 복사했습니다");
    } catch {
      flash("복사에 실패했습니다. 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">요청 문구</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        정보성 알림톡 템플릿 예시입니다. 광고·할인 문구는 넣지 마세요. 실발송은 채널 심사 후 연동합니다.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="sc-card p-5">
          <h2 className="text-sm font-semibold text-ink">발송 단계</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-semibold text-ink">1차 요청</span> — 마감 D-7 또는 D-3
            </li>
            <li>
              <span className="font-semibold text-ink">2차 요청</span> — 미제출만, 마감 임박
            </li>
            <li>
              <span className="font-semibold text-ink">지연 안내</span> — 마감일 경과 후 1회
            </li>
          </ul>
          <div className="mt-6 rounded-xl border border-amber-soft bg-amber-soft/40 p-4 text-sm text-amber-ink">
            데모에서는 미리보기·복사만 됩니다. 솔라피 연동은 사업자·템플릿 심사 후 연결합니다.
          </div>
        </div>

        <div className="sc-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">알림톡 미리보기</h2>
            <button type="button" className="sc-btn-secondary min-h-9 px-3 text-xs" onClick={copyPreview}>
              복사
            </button>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-ink px-4 py-5 font-sans text-sm leading-relaxed text-paper/90">
            {sample}
          </pre>
        </div>
      </div>
    </DashboardShell>
  );
}
