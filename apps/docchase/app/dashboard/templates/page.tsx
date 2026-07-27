"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { UpgradeHint } from "@/components/PlanUI";
import { Toast } from "@/components/Toast";
import { alimtalkPreview, CHANNEL_HELP } from "@/lib/format";
import { planAllows } from "@/lib/plans";
import { submitUrlFor } from "@/lib/store";
import { useAppState } from "@/lib/useAppState";

export default function TemplatesPage() {
  const { ready, state, toast, flash } = useAppState();

  const sampleClient = useMemo(() => {
    if (!state) return null;
    return state.clients.find((x) => x.status !== "제출완료") || state.clients[0] || null;
  }, [state]);

  const withLink = state ? planAllows(state.profile.plan, "submitLink") : false;
  const custom = state ? planAllows(state.profile.plan, "customTemplate") : false;

  const sample = useMemo(() => {
    if (!state || !sampleClient) return "";
    const link = withLink ? submitUrlFor(sampleClient.submitToken) : undefined;
    return alimtalkPreview(state.profile.officeName, sampleClient, state.monthLabel, link);
  }, [state, sampleClient, withLink]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(sample);
      flash("문구를 복사했어요");
    } catch {
      flash("복사 실패");
    }
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">보낼 말</h1>
      <p className="mt-2 text-sm text-ink-muted">사무원이 전화로 말하던 내용을 알림톡 문장으로 바꿉니다.</p>

      <div className="mt-5 rounded-2xl border border-pine-200 bg-pine-50/80 p-4 text-sm text-pine-800">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          <li>안 낸 거래처 찾기 → 오늘 독촉</li>
          <li>휴대폰으로 알림톡 → {withLink ? "제출 링크 포함" : "안내 문구 (링크는 스탠다드+)"}</li>
          <li>파일 오면 → 자료 받았어요</li>
        </ol>
        <p className="mt-3 text-xs">{CHANNEL_HELP}</p>
      </div>

      {!custom ? (
        <div className="mt-4">
          <UpgradeHint feature="거래처별 맞춤 문구" need="pro" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-pine-700">프로: 거래처별 맞춤 문구를 설정에서 확장할 수 있습니다.</p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="sc-card p-5">
          <h2 className="text-sm font-semibold text-ink">발송 단계</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-semibold text-ink">1차 안내</span> — 마감 전 처음
            </li>
            <li>
              <span className="font-semibold text-ink">2차 독촉</span> — 미제출만 다시
            </li>
            <li>
              <span className="font-semibold text-ink">지연 안내</span> — 마감 후
            </li>
          </ul>
        </div>
        <div className="sc-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">미리보기</h2>
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
