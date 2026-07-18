"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { settingsPage } from "@/lib/content";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";
import { openEffiroadAssistant } from "@/lib/assistant-events";

type HistoryItem = { role: "user" | "assistant"; text: string };

type Props = {
  provider: ForwardingProviderId;
};

const QUICK_QUESTIONS = [
  "테스트 전화가 실패했어요 — 뭐부터 확인하나요?",
  "iPhone 착신전환 설정 써도 되나요?",
  "Dialpad에서 어디를 눌러야 하나요?",
  "*71 / **61* 코드가 안 먹혀요",
] as const;

export function ForwardingAiHelpPanel({ provider }: Props) {
  const copy = settingsPage.forwardingAiHelp;
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(8);
  const [error, setError] = useState<string | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/forwarding-help");
      if (!res.ok) return;
      const data = (await res.json()) as { remaining?: number; limit?: number };
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setLimit(data.limit);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    if (remaining === 0) {
      setError(copy.dailyLimitHit);
      return;
    }

    setLoading(true);
    setError(null);
    setQuestion("");

    const nextHistory = [...history, { role: "user" as const, text: trimmed }].slice(-6);
    setHistory(nextHistory);

    try {
      const res = await fetch("/api/settings/forwarding-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          provider,
          history: history.slice(-4),
        }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        remaining?: number;
        limit?: number;
      };

      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setLimit(data.limit);

      if (!res.ok) {
        if (data.error === "daily_limit") {
          setError(copy.dailyLimitHit);
          setRemaining(0);
          return;
        }
        setError(data.error ?? copy.errorGeneric);
        return;
      }

      const answer = data.answer?.trim();
      if (answer) {
        setHistory([...nextHistory, { role: "assistant" as const, text: answer }].slice(-8));
      }
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{copy.badge}</p>
          <p className="mt-0.5 text-sm font-bold text-violet-950 sm:text-base">{copy.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy.subtitle}</p>
        </div>
        {remaining !== null ? (
          <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-900 sm:text-xs">
            {copy.quotaLabel(remaining, limit)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading || remaining === 0}
            onClick={() => void ask(q)}
            className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-medium text-violet-900 hover:border-violet-400 disabled:opacity-50 sm:text-xs"
          >
            {q}
          </button>
        ))}
      </div>

      {history.length > 0 ? (
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-violet-100 bg-white p-2.5">
          {history.map((item, i) => (
            <div
              key={`${item.role}-${i}`}
              className={`text-xs leading-relaxed sm:text-sm ${
                item.role === "user" ? "text-slate-800" : "text-violet-950"
              }`}
            >
              <span className="font-bold">{item.role === "user" ? "You: " : "AI: "}</span>
              {item.text}
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setError(null);
          }}
          placeholder={copy.placeholder}
          maxLength={500}
          disabled={loading || remaining === 0}
          className="vow-settings-input min-w-0 flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading || remaining === 0}
          className="shrink-0 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:text-sm"
        >
          {loading ? copy.sending : copy.ask}
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}

      {remaining === 0 ? (
        <p className="mt-2 text-xs text-slate-600">
          {copy.fullAiHint}{" "}
          <button
            type="button"
            onClick={() => openEffiroadAssistant()}
            className="font-semibold text-violet-800 underline"
          >
            {copy.fullAiLink}
          </button>
        </p>
      ) : null}
    </div>
  );
}
