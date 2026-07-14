"use client";

import { usePathname } from "next/navigation";
import { EffiroadAiMark } from "@/components/brand/EffiroadAiMark";
import { useAssistantHint } from "@/lib/assistant-hint";
import { openEffiroadAssistant } from "@/lib/assistant-events";
import { ROUTES } from "@/lib/constants";
import { useLocale, useVowDashboard } from "@/components/providers/LocaleProvider";
import {
  hydrateAssistantStore,
  markAssistantRead,
  useAssistantStore,
} from "@/lib/assistant-session-store";
import { useEffect } from "react";

export function SidebarAiLauncher() {
  const pathname = usePathname();
  const { isEnglish } = useLocale();
  const v = useVowDashboard().nav;
  const { unread } = useAssistantStore();
  const { hintVisible, dismissHint } = useAssistantHint();
  const active = pathname.startsWith(ROUTES.ai);

  useEffect(() => {
    hydrateAssistantStore();
  }, []);

  const copy = isEnglish
    ? {
        name: "Effiroad AI",
        hint: "Tap here — ask about setup, calls, or your shop.",
        close: "Close",
        open: "Open Effiroad AI",
        newReply: "New AI reply",
      }
    : {
        name: "Effiroad AI",
        hint: "여기를 눌러 설정·통화·샵 운영을 물어보세요.",
        close: "닫기",
        open: "Effiroad AI 열기",
        newReply: "새 AI 답변",
      };

  function handleOpen() {
    dismissHint();
    markAssistantRead();
    openEffiroadAssistant();
  }

  return (
    <div className="vow-dash-ai-sanctuary relative mt-8">
      {hintVisible ? (
        <div
          className="kb-speech-bubble kb-speech-bubble-sidebar kb-speech-bubble-from-ai pointer-events-auto mb-2.5 pr-8"
          role="status"
        >
          <button
            type="button"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm text-stone-400 hover:bg-stone-50"
            aria-label={copy.close}
            onClick={dismissHint}
          >
            ×
          </button>
          <p className="text-xs font-semibold text-brand-800">{copy.name}</p>
          <p className="mt-1 text-[13px] leading-snug text-stone-600">{copy.hint}</p>
          <span className="kb-speech-bubble-tail kb-speech-bubble-tail-down left-6" aria-hidden />
        </div>
      ) : null}

      <button
        type="button"
        data-tour-step="sidebar-ai"
        className={`vow-dash-ai-card relative w-full text-left ${active ? "vow-dash-ai-card-active" : ""}`}
        aria-label={unread ? copy.newReply : copy.open}
        onClick={handleOpen}
      >
        <EffiroadAiMark size={52} showBadge={false} className="rounded-2xl shadow-lg" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">Effiroad AI</span>
          <span className="block truncate text-xs text-brand-200/80">
            {v.ai === "Shop AI" ? "Ask anything · settings help" : "무엇이든 물어보세요 · 설정 도움"}
          </span>
        </span>
        {unread ? (
          <span className="absolute right-3 top-3 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#3d3228]">
            !
          </span>
        ) : null}
      </button>
    </div>
  );
}
