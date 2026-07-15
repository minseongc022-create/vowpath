"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { getAssistantWidgetCopy, getPublicExamplePrompts } from "@/lib/assistant-public-copy";
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
import { ASSISTANT_HINT_KEY, useAssistantHint } from "@/lib/assistant-hint";

type ExamplePrompt = { icon: string; label: string; question: string };

const EXAMPLES_DASHBOARD_EN: ExamplePrompt[] = [
  { icon: "📊", label: "Shop briefing", question: "Give me a quick briefing on my shop today" },
  { icon: "⏳", label: "Pending approvals", question: "Do I have any requests waiting for approval?" },
  { icon: "☎️", label: "Phone setup", question: "Where do I set up call forwarding?" },
  { icon: "🚚", label: "Crew on-call", question: "How do I add techs and set on-call hours?" },
];

const EXAMPLES_DASHBOARD_KO: ExamplePrompt[] = [
  { icon: "📊", label: "오늘 현황", question: "오늘 샵 운영 브리핑 해줘" },
  { icon: "⏳", label: "승인 대기", question: "승인 대기 중인 요청 있어?" },
  { icon: "☎️", label: "전화 설정", question: "착신전환은 어디서 설정해?" },
  { icon: "🚚", label: "크루 온콜", question: "기사 추가랑 온콜 스케줄 어떻게 해?" },
];

function IconSend() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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

type ComposerProps = {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder: string;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  sendLabel: string;
  centered?: boolean;
};

function AiComposer({
  input,
  setInput,
  onSubmit,
  placeholder,
  loading,
  inputRef,
  sendLabel,
  centered,
}: ComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`kb-ai-composer ${centered ? "kb-ai-composer-centered" : ""}`}
    >
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="kb-ai-composer-input"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        className="kb-ai-composer-send"
        aria-label={sendLabel}
      >
        <IconSend />
      </button>
    </form>
  );
}

export function EffiroadAssistantWidget() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { loggedIn, displayName, inDashboard } = useAssistantContext(pathname);
  const useShopAi = inDashboard && Boolean(loggedIn);
  const { messages, loading, unread, booted, starters } = useAssistantStore();
  const { hintVisible, dismissHint: dismissPublicHint } = useAssistantHint();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const copy = getAssistantWidgetCopy(locale, displayName, useShopAi);

  const examplePrompts = useMemo(() => {
    if (useShopAi) return locale === "ko" ? EXAMPLES_DASHBOARD_KO : EXAMPLES_DASHBOARD_EN;
    return getPublicExamplePrompts(locale);
  }, [useShopAi, locale]);

  useEffect(() => {
    hydrateAssistantStore();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    markAssistantRead();
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const dismissHint = useCallback(() => {
    dismissPublicHint();
    sessionStorage.setItem(ASSISTANT_HINT_KEY, "1");
  }, [dismissPublicHint]);

  const openChat = useCallback(() => {
    dismissHint();
    markAssistantRead();
    setOpen(true);
  }, [dismissHint]);

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
    patchAssistantStore({
      booted: true,
      starters: examplePrompts.map((e) => e.question),
    });
    try {
      if (useShopAi) {
        const res = await fetch("/api/effiroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proactive: true }),
        });
        const data = (await res.json()) as Partial<EffiroadAiResponse> & { error?: string };
        if (data.suggestions?.length) {
          patchAssistantStore({ starters: data.suggestions.slice(0, 6) });
        }
      }
    } catch {
      /* keep default examples */
    }
  }, [booted, useShopAi, examplePrompts]);

  useEffect(() => {
    if (open && loggedIn !== null) void bootChat();
  }, [open, loggedIn, bootChat]);

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
      if (useShopAi) {
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
            (copy.errorLoad),
          suggestions: data.suggestions,
          actions: data.actions?.filter((a) => a.href).map((a) => ({ label: a.label, href: a.href })),
        });
      } else {
        const res = await fetch("/api/site-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, history: historyPayload, marketing: true }),
        });
        const data = (await res.json()) as { answer?: string; suggestions?: string[]; error?: string };
        pushAssistant({
          text: data.answer ?? data.error ?? copy.errorRetry,
          suggestions: data.suggestions,
        });
      }
    } catch {
      pushAssistant({
        text: copy.errorGeneric,
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

  const hasConversation = messages.some((m) => m.role === "user");
  const suggestionQuestions =
    starters.length > 0 ? starters.slice(0, 4) : examplePrompts.map((e) => e.question);

  const fabAnchorBottom = "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]";
  const showPublicFab = !inDashboard;
  const thinkingAnchorBottom = inDashboard
    ? "bottom-6 lg:bottom-8"
    : fabAnchorBottom;

  const unreadDot = unread ? (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
      !
    </span>
  ) : null;

  const exampleRows = examplePrompts.map((ex) => {
    const match = suggestionQuestions.find((q) => q === ex.question);
    if (match) return ex;
    return ex;
  });

  return (
    <>
      {!open && loading ? (
        <div
          className={`pointer-events-none fixed ${thinkingAnchorBottom} right-4 z-[255] max-w-[12rem] rounded-full bg-stone-800/90 px-3 py-2 text-center text-[11px] font-medium text-white shadow-lg sm:right-5`}
        >
          {copy.thinkingBackground}
        </div>
      ) : null}

      {!open && showPublicFab ? (
        <div
          className={`fixed ${fabAnchorBottom} right-4 z-[260] flex flex-col items-end gap-2 sm:right-5`}
        >
          {hintVisible && !loading ? (
            <div
              className="kb-speech-bubble kb-speech-bubble-fab kb-speech-bubble-from-ai pointer-events-auto max-w-[min(calc(100vw-5.5rem),18rem)] pr-8"
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
              <p className="mt-1 text-stone-600">{copy.hint}</p>
              <span className="kb-speech-bubble-tail kb-speech-bubble-tail-fab right-[1.625rem]" aria-hidden />
            </div>
          ) : null}

          <button
            type="button"
            className="relative flex size-14 items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none outline-none ring-0 transition hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
            aria-label={unread ? copy.newReply : copy.open}
            onClick={openChat}
          >
            <EffiroadAiMark
              size={56}
              className="drop-shadow-[0_4px_14px_rgb(61_50_40_/_0.28)]"
            />
            {unreadDot}
          </button>
        </div>
      ) : null}

      {open ? (
        <section
          className={`kb-ai-screen ${inDashboard ? "kb-ai-screen-dash" : ""}`}
          role="dialog"
          aria-label={copy.name}
        >
          <header className="kb-ai-header">
            <button
              type="button"
              className="kb-ai-header-btn"
              aria-label={copy.close}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <EffiroadAiMark size={24} />
              <span className="truncate text-sm font-semibold text-stone-800">{copy.name}</span>
            </div>
            {useShopAi ? (
              <Link
                href={ROUTES.ai}
                className="kb-ai-header-link"
                onClick={() => setOpen(false)}
                title={copy.fullAi}
              >
                ↗
              </Link>
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </header>

          {!hasConversation ? (
            <div className="kb-ai-empty">
              <h1 className="kb-ai-headline">{copy.headline}</h1>

              <div className="kb-ai-empty-inner">
                <AiComposer
                  input={input}
                  setInput={setInput}
                  onSubmit={onSubmit}
                  placeholder={copy.placeholder}
                  loading={loading}
                  inputRef={inputRef}
                  sendLabel={copy.send}
                  centered
                />

                <p className="kb-ai-examples-label">{copy.examples}</p>
                <ul className="kb-ai-examples">
                  {exampleRows.map((ex) => (
                    <li key={ex.label}>
                      <button
                        type="button"
                        className="kb-ai-example-row"
                        onClick={() => void sendQuestion(ex.question)}
                        disabled={loading}
                      >
                        <span className="kb-ai-example-icon" aria-hidden>
                          {ex.icon}
                        </span>
                        <span>{ex.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="kb-ai-thread vow-ai-scrollbar">
                <div className="kb-ai-thread-inner">
                  {messages.map((m) =>
                    m.role === "user" ? (
                      <div key={m.id} className="kb-ai-msg-user">
                        {m.text}
                      </div>
                    ) : (
                      <div key={m.id} className="kb-ai-msg-assistant">
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        {m.actions?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {m.actions.map((a) =>
                              a.href ? (
                                <Link
                                  key={`${a.label}-${a.href}`}
                                  href={a.href}
                                  className="kb-ai-action-link"
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
                            {m.suggestions.slice(0, 3).map((s) => (
                              <button
                                key={s}
                                type="button"
                                className="kb-ai-chip"
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
                  {loading ? <p className="kb-ai-thinking">{copy.thinking}</p> : null}
                </div>
              </div>

              <div className="kb-ai-footer">
                <AiComposer
                  input={input}
                  setInput={setInput}
                  onSubmit={onSubmit}
                  placeholder={copy.placeholder}
                  loading={loading}
                  inputRef={inputRef}
                  sendLabel={copy.send}
                />
              </div>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
