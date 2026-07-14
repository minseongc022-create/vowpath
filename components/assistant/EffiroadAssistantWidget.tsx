"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { EffiroadAiMark } from "@/components/brand/EffiroadAiMark";
import { OPEN_AI_EVENT } from "@/lib/assistant-events";
import {
  beginAssistantRequest,
  endAssistantRequest,
  hydrateAssistantStore,
  markAssistantRead,
  patchAssistantStore,
  pushAssistantMessage,
  useAssistantStore,
} from "@/lib/assistant-session-store";
import type { EffiroadAiResponse } from "@/lib/effiroad-ai-query";
import { ROUTES } from "@/lib/constants";

const HINT_KEY = "effiroad-ai-hint-v2";

const STARTERS_EN = [
  "How does Effiroad answer my calls?",
  "What should I set up first?",
  "How does crew dispatch work?",
  "Explain pricing and the free trial",
] as const;

const STARTERS_KO = [
  "통화는 어떻게 응대하나요?",
  "처음에 뭘 설정해야 하나요?",
  "크루 디스패치는 어떻게 되나요?",
  "요금제와 무료 체험 알려줘",
] as const;

function IconSend() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L17 12l-10.8 1.4-2.8 7.2z" />
    </svg>
  );
}

function useAssistantContext(pathname: string) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [inDashboard, setInDashboard] = useState(false);

  useEffect(() => {
    setInDashboard(pathname.startsWith("/dashboard"));
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { shopName?: string; email?: string } | null) => {
        setLoggedIn(!!d);
        if (d?.shopName) setDisplayName(d.shopName);
        else if (d?.email) setDisplayName(d.email.split("@")[0] ?? "");
      })
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  return { loggedIn, displayName, inDashboard };
}

export function EffiroadAssistantWidget() {
  const pathname = usePathname();
  const { isEnglish } = useLocale();
  const { loggedIn, displayName, inDashboard } = useAssistantContext(pathname);
  const { messages, loading, unread, booted, starters } = useAssistantStore();
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const copy = isEnglish
    ? {
        name: "Effiroad AI",
        hint: "Tap the AI button to ask about features, settings, or your shop — I'll guide you step by step.",
        openHint: "Open AI",
        greet: (name: string) =>
          name ? `${name}, ask Effiroad AI anything` : "Ask Effiroad AI like you're chatting",
        subgreet: "Calls, dispatch, settings, analytics — just type naturally.",
        placeholder: loggedIn ? "Type your question…" : "Ask about features, pricing, setup…",
        close: "Close",
        open: "Open Effiroad AI",
        thinking: "Thinking…",
        thinkingBackground: "Effiroad AI is replying…",
        fullAi: "Open full AI workspace",
        newReply: "New AI reply",
      }
    : {
        name: "Effiroad AI",
        hint: "기능·설정·샵 운영이 궁금하면 AI 버튼을 눌러보세요. 대화하듯 안내해 드릴게요.",
        openHint: "AI 열기",
        greet: (name: string) =>
          name ? `${name}님, Effiroad AI에게 물어보세요` : "대화하듯 Effiroad AI에게 물어보세요",
        subgreet: "통화, 디스패치, 설정, 분석 — 편하게 물어보세요.",
        placeholder: loggedIn ? "메시지를 입력해주세요" : "기능, 가격, 설정 방법을 물어보세요",
        close: "닫기",
        open: "Effiroad AI 열기",
        thinking: "생각 중…",
        thinkingBackground: "Effiroad AI가 답변 중…",
        fullAi: "전체 AI 화면 열기",
        newReply: "새 AI 답변",
      };

  const defaultStarters = useMemo(
    () => (isEnglish ? [...STARTERS_EN] : [...STARTERS_KO]),
    [isEnglish],
  );

  useEffect(() => {
    hydrateAssistantStore();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(HINT_KEY)) return;
    const t = window.setTimeout(() => setHintVisible(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    markAssistantRead();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    sessionStorage.setItem(HINT_KEY, "1");
  }, []);

  const pushAssistant = useCallback(
    (payload: {
      text: string;
      suggestions?: string[];
      actions?: { label: string; href?: string }[];
    }) => {
      pushAssistantMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        text: payload.text,
        suggestions: payload.suggestions,
        actions: payload.actions,
      });
      if (payload.suggestions?.length) {
        patchAssistantStore({ starters: payload.suggestions.slice(0, 6) });
      }
    },
    [],
  );

  const bootChat = useCallback(async () => {
    if (booted) return;
    patchAssistantStore({ booted: true, starters: defaultStarters });
    beginAssistantRequest();
    try {
      if (loggedIn) {
        const res = await fetch("/api/effiroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proactive: true }),
        });
        const data = (await res.json()) as Partial<EffiroadAiResponse> & { error?: string };
        if (data.suggestions?.length) patchAssistantStore({ starters: data.suggestions.slice(0, 6) });
        pushAssistant({
          text:
            data.answer ??
            (isEnglish
              ? "Hi! Ask me about calls, bookings, settings, or shop analytics."
              : "안녕하세요! 통화, 예약, 설정, 분석에 대해 물어보세요."),
          suggestions: data.suggestions,
          actions: data.actions?.filter((a) => a.href).map((a) => ({ label: a.label, href: a.href })),
        });
      } else {
        const res = await fetch("/api/site-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ greet: true }),
        });
        const data = (await res.json()) as { answer?: string; suggestions?: string[] };
        if (data.suggestions?.length) patchAssistantStore({ starters: data.suggestions.slice(0, 6) });
        pushAssistant({
          text: data.answer ?? copy.subgreet,
          suggestions: data.suggestions,
        });
      }
    } catch {
      pushAssistant({
        text: isEnglish
          ? "Hi! I'm Effiroad AI — ask me anything about the product."
          : "안녕하세요! Effiroad AI예요 — 무엇이든 물어보세요.",
      });
    } finally {
      endAssistantRequest({ panelOpen: openRef.current });
    }
  }, [booted, loggedIn, isEnglish, pushAssistant, copy.subgreet, defaultStarters]);

  useEffect(() => {
    if (open && loggedIn !== null) void bootChat();
  }, [open, loggedIn, bootChat]);

  const openChat = useCallback(() => {
    dismissHint();
    markAssistantRead();
    setOpen(true);
  }, [dismissHint]);

  useEffect(() => {
    const handler = () => openChat();
    window.addEventListener(OPEN_AI_EVENT, handler);
    return () => window.removeEventListener(OPEN_AI_EVENT, handler);
  }, [openChat]);

  async function sendQuestion(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    const historyPayload = messages.slice(-10).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    pushAssistantMessage({ id: crypto.randomUUID(), role: "user", text: q });
    setInput("");
    beginAssistantRequest();

    try {
      if (loggedIn) {
        const res = await fetch("/api/effiroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, history: historyPayload }),
        });
        const data = (await res.json()) as Partial<EffiroadAiResponse> & { error?: string };
        pushAssistant({
          text:
            data.answer ??
            data.error ??
            (isEnglish ? "I couldn't load that right now." : "지금은 불러오지 못했습니다."),
          suggestions: data.suggestions,
          actions: data.actions?.filter((a) => a.href).map((a) => ({ label: a.label, href: a.href })),
        });
      } else {
        const res = await fetch("/api/site-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, history: historyPayload }),
        });
        const data = (await res.json()) as { answer?: string; suggestions?: string[]; error?: string };
        pushAssistant({
          text: data.answer ?? data.error ?? (isEnglish ? "Try again in a moment." : "잠시 후 다시 시도해 주세요."),
          suggestions: data.suggestions,
        });
      }
    } catch {
      pushAssistant({
        text: isEnglish ? "Something went wrong. Please try again." : "오류가 발생했습니다. 다시 시도해 주세요.",
      });
    } finally {
      endAssistantRequest({ panelOpen: openRef.current });
      if (openRef.current) inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendQuestion(input);
  }

  const hidden =
    pathname.startsWith("/widget/") ||
    pathname.startsWith("/demo/record") ||
    pathname.startsWith("/intake/") ||
    pathname.startsWith("/r/");

  if (hidden) return null;

  const showEmptyHero = messages.filter((m) => m.role === "user").length === 0;
  const promptList = starters.length ? starters : defaultStarters;

  const hintBottom = inDashboard
    ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6"
    : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]";

  const fabBottom = inDashboard
    ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6"
    : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]";

  const statusPill = !open && loading ? (
    <div
      className={`pointer-events-none fixed ${hintBottom} right-4 z-[255] max-w-[12rem] rounded-full bg-[#3d3228]/90 px-3 py-2 text-center text-[11px] font-semibold text-white shadow-lg sm:right-5`}
    >
      {copy.thinkingBackground}
    </div>
  ) : null;

  const unreadDot = unread ? (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
      !
    </span>
  ) : null;

  return (
    <>
      {statusPill}

      {hintVisible && !open && !loading ? (
        <div
          className={`fixed ${hintBottom} right-4 z-[260] flex max-w-[min(calc(100vw-5.5rem),18rem)] flex-col items-end gap-2 sm:right-5 sm:max-w-xs`}
          role="status"
        >
          <div className="kb-speech-bubble pointer-events-auto pr-8">
            <button
              type="button"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-sm text-stone-500"
              aria-label={copy.close}
              onClick={dismissHint}
            >
              ×
            </button>
            <p>{copy.hint}</p>
            <span className={`kb-speech-bubble-tail ${inDashboard ? "right-14 lg:right-5" : "right-5"}`} aria-hidden />
          </div>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          className={`fixed ${fabBottom} right-4 z-[240] relative flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95 sm:h-[3.25rem] sm:w-[3.25rem] ${inDashboard ? "hidden lg:flex" : ""}`}
          style={{ boxShadow: "0 4px 16px rgb(61 50 40 / 0.28), 0 8px 28px rgb(61 50 40 / 0.18)" }}
          aria-label={unread ? copy.newReply : copy.open}
          onClick={openChat}
        >
          <EffiroadAiMark size={56} className="rounded-full" showBadge />
          {unreadDot}
        </button>
      ) : null}

      {open ? (
        <section className="kb-ai-screen" role="dialog" aria-label={copy.name}>
          <header className="flex shrink-0 items-center gap-2 px-3 py-3 sm:px-4">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-xl text-stone-600 hover:bg-white/60"
              aria-label={copy.close}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-base font-bold text-brand-950">{copy.name}</p>
            <span className="min-w-[44px]" aria-hidden />
          </header>

          <div ref={scrollRef} className="vow-ai-scrollbar flex flex-1 flex-col overflow-y-auto">
            {showEmptyHero ? (
              <div className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
                <EffiroadAiMark size={72} className="rounded-3xl" showBadge={false} />
                <h2 className="mt-5 text-xl font-bold leading-snug text-brand-950 sm:text-2xl">
                  {copy.greet(displayName)}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{copy.subgreet}</p>
              </div>
            ) : null}

            {showEmptyHero ? (
              <div className="flex flex-col gap-3 px-4 pb-4">
                {promptList.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="kb-prompt-pill"
                    onClick={() => void sendQuestion(s)}
                    disabled={loading}
                  >
                    <EffiroadAiMark size={36} showBadge={false} className="rounded-xl" />
                    <span className="min-w-0 flex-1">{s}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 px-4 py-4">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div
                      key={m.id}
                      className="ml-auto max-w-[88%] rounded-[1.25rem] rounded-tr-md bg-brand-800 px-4 py-3 text-[15px] font-medium leading-relaxed text-white"
                    >
                      {m.text}
                    </div>
                  ) : (
                    <div key={m.id} className="max-w-[95%]">
                      <div className="kb-3d-card px-4 py-3">
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">{m.text}</p>
                        {m.actions?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {m.actions.map((a) =>
                              a.href ? (
                                <Link
                                  key={`${a.label}-${a.href}`}
                                  href={a.href}
                                  className="kb-3d-btn px-3 py-2 text-xs"
                                  onClick={() => setOpen(false)}
                                >
                                  {a.label}
                                </Link>
                              ) : null,
                            )}
                          </div>
                        ) : null}
                      </div>
                      {m.suggestions?.length ? (
                        <div className="mt-2 flex flex-col gap-2">
                          {m.suggestions.slice(0, 3).map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="kb-prompt-pill !min-h-[44px] !py-2.5 !text-sm"
                              onClick={() => void sendQuestion(s)}
                              disabled={loading}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ),
                )}
                {loading ? <p className="px-1 text-sm text-stone-500">{copy.thinking}</p> : null}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="kb-ai-input-wrap">
            {loggedIn ? (
              <Link
                href={ROUTES.ai}
                className="mb-2 block text-center text-xs font-semibold text-brand-700 hover:underline"
                onClick={() => setOpen(false)}
              >
                {copy.fullAi} →
              </Link>
            ) : null}
            <div className="kb-ai-input-bar">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.placeholder}
                className="kb-ai-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="kb-ai-send-btn"
                aria-label={isEnglish ? "Send" : "전송"}
              >
                <IconSend />
              </button>
            </div>
          </form>
        </section>
      ) : null}

    </>
  );
}
