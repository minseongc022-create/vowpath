"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { alimtalkPreview } from "@/lib/format";
import { loadState } from "@/lib/store";
import type { AppState } from "@/lib/types";

export default function TemplatesPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    if (!window.localStorage.getItem("suimcheck.session")) {
      router.replace("/login");
      return;
    }
    setState(loadState());
  }, [router]);

  const sample = useMemo(() => {
    if (!state) return "";
    const c = state.clients[0];
    return alimtalkPreview(
      state.profile.officeName,
      c?.name || "거래처",
      c?.docs || ["통장사본", "카드매출"],
      state.monthLabel,
    );
  }, [state]);

  if (!state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  return (
    <DashboardShell officeName={state.profile.officeName}>
      <h1 className="font-display text-3xl font-semibold text-ink">요청 문구</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        카카오 알림톡은 정보성 템플릿 심사를 통과한 문구만 발송할 수 있습니다.
        아래는 수임 계약 이행용 안내 예시입니다. 광고·할인 문구는 넣지 마세요.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="sc-card p-5">
          <h2 className="text-sm font-semibold text-ink">템플릿 구성</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-semibold text-ink">1차 요청</span> — 마감 D-7 또는 D-3, 필요 자료 목록
            </li>
            <li>
              <span className="font-semibold text-ink">2차 요청</span> — 미제출 수임처만, 마감 임박 안내
            </li>
            <li>
              <span className="font-semibold text-ink">지연 안내</span> — 마감일 경과 후 1회성 안내
            </li>
          </ul>
          <div className="mt-6 rounded-xl border border-amber-soft bg-amber-soft/40 p-4 text-sm text-amber-ink">
            실제 발송 전 솔라피·카카오 채널 심사와 발신 프로필 등록이 필요합니다.
            데모에서는 문구 미리보기만 제공합니다.
          </div>
        </div>

        <div className="sc-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">알림톡 미리보기</h2>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-pine-700">
              정보성
            </span>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-ink px-4 py-5 font-sans text-sm leading-relaxed text-paper/90">
            {sample}
          </pre>
        </div>
      </div>
    </DashboardShell>
  );
}
