"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Toast } from "@/components/Toast";
import { alimtalkPreview, CHANNEL_HELP } from "@/lib/format";
import { useAppState } from "@/lib/useAppState";

export default function TemplatesPage() {
  const { ready, state, toast, flash } = useAppState();

  const sampleClient = useMemo(() => {
    if (!state) return null;
    return state.clients.find((x) => x.status !== "제출완료") || state.clients[0] || null;
  }, [state]);

  const sample = useMemo(() => {
    if (!state || !sampleClient) return "";
    return alimtalkPreview(state.profile.officeName, sampleClient, state.monthLabel);
  }, [state, sampleClient]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(sample);
      flash("문구를 복사했어요");
    } catch {
      flash("복사에 실패했습니다");
    }
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">보낼 말</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
        사무원이 전화로 말하던 내용을, 카카오 알림톡 문장으로 바꾼 것입니다. 광고·할인 멘트는 넣지 않습니다.
      </p>

      <div className="mt-5 rounded-2xl border border-pine-200 bg-pine-50/80 p-4 text-sm text-pine-800">
        <p className="font-semibold">실제 사무소에서 하던 방식 → 수임체크</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>엑셀에서 ‘자료 안 준 거래처’ 찾기 → <strong>오늘 독촉</strong> 목록</li>
          <li>담당자 휴대폰으로 전화/개인카톡 → <strong>같은 번호로 알림톡</strong></li>
          <li>받았는지 메모 → <strong>자료 받았어요</strong> 버튼</li>
        </ol>
        <p className="mt-3 text-xs leading-relaxed">{CHANNEL_HELP}</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="sc-card p-5">
          <h2 className="text-sm font-semibold text-ink">언제 보내나요?</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-semibold text-ink">1차 안내</span> — 마감 며칠 전, 처음 한 번
            </li>
            <li>
              <span className="font-semibold text-ink">2차 독촉</span> — 아직 안 오면 한 번 더
            </li>
            <li>
              <span className="font-semibold text-ink">지연 안내</span> — 마감이 지나도 없을 때
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-amber-ink">
            연습 모드에서는 「오늘 독촉」에서 보내도 실제 카톡은 나가지 않습니다. 연동 후 같은 화면으로
            발송됩니다.
          </p>
        </div>

        <div className="sc-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">미리보기</h2>
              {sampleClient ? (
                <p className="mt-0.5 text-xs text-ink-muted">
                  예: {sampleClient.name} · {sampleClient.phone}
                </p>
              ) : null}
            </div>
            <button type="button" className="sc-btn-secondary min-h-9 px-3 text-xs" onClick={copyPreview}>
              복사
            </button>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-ink px-4 py-5 font-sans text-sm leading-relaxed text-paper/90">
            {sample || "거래처를 먼저 등록해 주세요."}
          </pre>
        </div>
      </div>
    </DashboardShell>
  );
}
