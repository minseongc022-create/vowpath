"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { EffiroadAiResponse } from "@/lib/effiroad-ai-query";
import { ROUTES } from "@/lib/constants";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; suggestions?: string[]; actions?: { label: string; href?: string }[] };

const HINT_KEY = "effiroad-ai-hint-v1";

function useAssistantContext() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [inDashboard, setInDashboard] = useState(false);

  useEffect(() => {
    setInDashboard(window.location.pathname.startsWith("/dashboard"));
    fetch("/api/me")
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  return { loggedIn, inDashboard };
}

export function EffiroadAssistantWidget() {
  const pathname = usePathname();
  const { isEnglish } = useLocale();
  const { loggedIn, inDashboard } = useAssistantContext();
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const copy = isEnglish
    ? {
        name: "Effiroad AI",
        hint: "Curious about features, settings, or your shop? Tap here — I'll walk you through it.",
        placeholder: loggedIn ? "Ask anything about your shop…" : "Ask about features, pricing, setup…",
        ask: "Ask",
        close: "Close",
        open: "Open Effiroad AI",
        thinking: "Thinking…",
        fullAi: "Open full AI workspace",
      }
    : {
        name: "Effiroad AI",
        hint: "기능·설정·샵 분석이 궁금하면 여기를 눌러 물어보세요. 자연스럽게 안내해 드릴게요.",
        placeholder: loggedIn ? "샵 설정·기능 뭐든 물어보세요…" : "기능, 가격, 설정 방법을 물어보세요…",
        ask: "질문",
        close: "닫기",
        open: "Effiroad AI 열기",
        thinking: "생각 중…",
        fullAi: "전체 AI 화면 열기",
      };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(HINT_KEY)) {
      const t = window.setTimeout(() => setHintVisible(true), 1200);
      return () => window.clearTimeout(t);
    }
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
    localStorage.setItem(HINT_KEY, "1");
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
    },
    [],
  );

  const bootChat = useCallback(async () => {
    if (booted) return;
    setBooted(true);
    setLoading(true);
    try {
      if (loggedIn) {
        const res = await fetch("/api/effiroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proactive: true }),
        });
        const data = (await res.json()) as Partial<EffiroadAiResponse> & { error?: string };
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
        pushAssistant({
          text: data.answer ?? copy.hint,
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
  }, [booted, loggedIn, isEnglish, pushAssistant, copy.hint]);

  useEffect(() => {
    if (open && loggedIn !== null) void bootChat();
  }, [open, loggedIn, bootChat]);

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

  function openChat() {
    dismissHint();
    setOpen(true);
  }

  const fabBottom = inDashboard
    ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
    : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]";

  const hidden =
    pathname.startsWith("/widget/") ||
    pathname.startsWith("/demo/record") ||
    pathname.startsWith("/intake/") ||
    pathname.startsWith("/r/");

  if (hidden) return null;

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[200] bg-brand-950/40 backdrop-blur-[2px] sm:bg-brand-950/25"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      {hintVisible && !open ? (
        <div
          className={`pointer-events-none fixed ${fabBottom} right-3 z-[190] flex max-w-[min(calc(100vw-4.5rem),18rem)] flex-col items-end sm:right-4 sm:max-w-xs`}
        >
          <div className="pointer-events-auto relative rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm leading-snug text-stone-700 shadow-lg shadow-brand-900/10">
            <button
              type="button"
              className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs text-stone-600"
              aria-label={copy.close}
              onClick={dismissHint}
            >
              ×
            </button>
            <p>{copy.hint}</p>
            <span
              className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-brand-200 bg-white"
              aria-hidden
            />
          </div>
        </div>
      ) : null}

      {open ? (
        <section
          className="fixed inset-x-0 bottom-0 z-[210] flex max-h-[min(92dvh,640px)] flex-col overflow-hidden rounded-t-3xl border border-brand-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-4 sm:w-[min(calc(100vw-2rem),24rem)] sm:rounded-2xl"
          role="dialog"
          aria-label={copy.name}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-brand-100 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg" aria-hidden>
              ✨
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brand-950">{copy.name}</p>
              <p className="truncate text-xs text-stone-500">
                {loggedIn
                  ? isEnglish
                    ? "Your shop copilot"
                    : "샵 운영 도우미"
                  : isEnglish
                    ? "Product guide"
                    : "제품 안내"}
              </p>
            </div>
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-brand-50"
              aria-label={copy.close}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </header>

          <div ref={scrollRef} className="vow-ai-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="ml-auto max-w-[88%] rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="max-w-[95%] rounded-2xl border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm leading-relaxed text-stone-800">
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.actions.map((a) =>
                        a.href ? (
                          <Link
                            key={`${a.label}-${a.href}`}
                            href={a.href}
                            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-900"
                            onClick={() => setOpen(false)}
                          >
                            {a.label}
                          </Link>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                  {m.suggestions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.suggestions.slice(0, 4).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800"
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
            {loading ? <p className="text-sm text-stone-500">{copy.thinking}</p> : null}
          </div>

          <form onSubmit={onSubmit} className="shrink-0 border-t border-brand-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {loggedIn ? (
              <Link
                href={ROUTES.ai}
                className="mb-2 block text-center text-xs font-medium text-brand-700 hover:underline"
                onClick={() => setOpen(false)}
              >
                {copy.fullAi} →
              </Link>
            ) : null}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.placeholder}
                className="min-h-[44px] flex-1 rounded-xl border border-brand-200 px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="min-h-[44px] shrink-0 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {copy.ask}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!open ? (
        <button
          type="button"
          className={`fixed ${fabBottom} right-3 z-[190] flex min-h-[60px] min-w-[60px] animate-pulse items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand-700 to-brand-500 px-4 text-white shadow-[0_8px_32px_rgb(61_50_40/0.35)] ring-4 ring-brand-300/40 transition hover:scale-105 hover:brightness-110 sm:right-4 sm:min-h-[56px] sm:min-w-[56px] sm:animate-none`}
          aria-label={copy.open}
          onClick={openChat}
        >
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <span className="hidden max-w-[7rem] truncate text-sm font-bold sm:inline">{copy.name}</span>
        </button>
      ) : null}
    </>
  );
}
