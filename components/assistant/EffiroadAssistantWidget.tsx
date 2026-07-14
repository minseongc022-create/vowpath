"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { OPEN_AI_EVENT } from "@/lib/assistant-events";
import type { EffiroadAiResponse } from "@/lib/effiroad-ai-query";
import { ROUTES } from "@/lib/constants";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; suggestions?: string[]; actions?: { label: string; href?: string }[] };

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

function IconStarAi() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 17.8 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2z" />
    </svg>
  );
}

function useAssistantContext() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [inDashboard, setInDashboard] = useState(false);

  useEffect(() => {
    setInDashboard(window.location.pathname.startsWith("/dashboard"));
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { shopName?: string; email?: string } | null) => {
        setLoggedIn(!!d);
        if (d?.shopName) setDisplayName(d.shopName);
        else if (d?.email) setDisplayName(d.email.split("@")[0] ?? "");
      })
      .catch(() => setLoggedIn(false));
  }, []);

  return { loggedIn, displayName, inDashboard };
}

export function EffiroadAssistantWidget() {
  const pathname = usePathname();
  const { isEnglish } = useLocale();
  const { loggedIn, displayName, inDashboard } = useAssistantContext();
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const copy = isEnglish
    ? {
        name: "Effiroad AI",
        hint: "Tap here to ask about features, settings, or your shop — I'll guide you step by step.",
        greet: (name: string) =>
          name ? `${name}, ask Effiroad AI anything` : "Ask Effiroad AI like you're chatting",
        subgreet: "Calls, dispatch, settings, analytics — just type naturally.",
        placeholder: loggedIn ? "Type your question…" : "Ask about features, pricing, setup…",
        close: "Close",
        open: "Open Effiroad AI",
        thinking: "Thinking…",
        fullAi: "Open full AI workspace",
      }
    : {
        name: "Effiroad AI",
        hint: "기능·설정·샵 운영이 궁금하면 여기를 눌러보세요. 대화하듯 안내해 드릴게요.",
        greet: (name: string) =>
          name ? `${name}님, Effiroad AI에게 물어보세요` : "대화하듯 Effiroad AI에게 물어보세요",
        subgreet: "통화, 디스패치, 설정, 분석 — 편하게 물어보세요.",
        placeholder: loggedIn ? "메시지를 입력해주세요" : "기능, 가격, 설정 방법을 물어보세요",
        close: "닫기",
        open: "Effiroad AI 열기",
        thinking: "생각 중…",
        fullAi: "전체 AI 화면 열기",
      };

  const defaultStarters = useMemo(
    () => (isEnglish ? [...STARTERS_EN] : [...STARTERS_KO]),
    [isEnglish],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(HINT_KEY)) return;
    const t = window.setTimeout(() => setHintVisible(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
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
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: payload.text,
          suggestions: payload.suggestions,
          actions: payload.actions,
        },
      ]);
      if (payload.suggestions?.length) {
        setStarters(payload.suggestions.slice(0, 6));
      }
    },
    [],
  );

  const bootChat = useCallback(async () => {
    if (booted) return;
    setBooted(true);
    setStarters(defaultStarters);
    setLoading(true);
    try {
      if (loggedIn) {
        const res = await fetch("/api/effiroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proactive: true }),
        });
        const data = (await res.json()) as Partial<EffiroadAiResponse> & { error?: string };
        if (data.suggestions?.length) setStarters(data.suggestions.slice(0, 6));
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
        if (data.suggestions?.length) setStarters(data.suggestions.slice(0, 6));
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
      setLoading(false);
    }
  }, [booted, loggedIn, isEnglish, pushAssistant, copy.subgreet, defaultStarters]);

  useEffect(() => {
    if (open && loggedIn !== null) void bootChat();
  }, [open, loggedIn, bootChat]);

  const openChat = useCallback(() => {
    dismissHint();
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
      text: m.role === "user" ? m.text : m.text,
    }));

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: q }]);
    setInput("");
    setLoading(true);

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
      setLoading(false);
      inputRef.current?.focus();
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
    ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
    : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]";

  const fabBottom = inDashboard
    ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
    : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]";

  return (
    <>
      {hintVisible && !open ? (
        <div
          className={`pointer-events-none fixed ${hintBottom} right-4 z-[260] flex max-w-[min(calc(100vw-5.5rem),16rem)] flex-col items-end sm:right-5 sm:max-w-xs`}
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
            <span className={`kb-speech-bubble-tail ${inDashboard ? "right-3" : "right-5"}`} aria-hidden />
          </div>
        </div>
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
                <div className="kb-ai-gem" aria-hidden>
                  ✦
                </div>
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
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <IconStarAi />
                    </span>
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

      {!open && !inDashboard ? (
        <button
          type="button"
          className={`fixed ${fabBottom} right-4 z-[240] flex h-14 w-14 items-center justify-center rounded-full bg-brand-950 text-white transition active:scale-95 sm:h-[3.25rem] sm:w-[3.25rem]`}
          style={{ boxShadow: "0 4px 16px rgb(61 50 40 / 0.28), 0 8px 28px rgb(61 50 40 / 0.18)" }}
          aria-label={copy.open}
          onClick={openChat}
        >
          <IconStarAi />
        </button>
      ) : null}
    </>
  );
}
