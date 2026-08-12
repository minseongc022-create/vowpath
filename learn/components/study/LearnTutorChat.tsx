"use client";

import { useEffect, useRef, useState } from "react";
import type { TutorMessage } from "@/learn/types/quiz";
import { cn } from "@/learn/lib/utils";

const STARTERS = [
  "이 강의 핵심만 3줄로 알려줘",
  "어려운 개념 쉽게 설명해줘",
  "시험에 나올 것 같은 포인트는?",
];

type Props = {
  materialId: string;
  materialTitle: string;
};

export function LearnTutorChat({ materialId, materialTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      role: "assistant",
      content: `안녕하세요! "${materialTitle}" 내용을 완벽히 이해하고 있어요. 궁금한 점을 물어보세요.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: TutorMessage = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`/learn/api/tutor/${materialId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "답변을 받지 못했어요." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "연결에 문제가 있어요. 잠시 후 다시 시도해 주세요." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-learn-primary text-white shadow-learn-md transition-transform active:scale-95 md:bottom-8"
          aria-label="AI 튜터 열기"
        >
          <span className="text-xl">💬</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-learn-border bg-learn-surface shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px] md:rounded-3xl">
          <header className="flex items-center justify-between border-b border-learn-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-learn-ink">AI 1:1 튜터</p>
              <p className="text-[11px] text-learn-ink-muted">이 자료 내용만 이해하고 답해요</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-learn-ink-muted hover:bg-learn-muted"
            >
              ✕
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 max-h-[50dvh] overflow-y-auto px-4 py-3 space-y-3 learn-scroll">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-learn-primary text-white"
                    : "bg-learn-muted text-learn-ink",
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p className="text-xs text-learn-ink-muted animate-pulse">생각 중…</p>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full bg-learn-muted px-3 py-1.5 text-[11px] font-medium text-learn-ink-muted hover:text-learn-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex gap-2 border-t border-learn-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="궁금한 점을 입력하세요"
              className="flex-1 rounded-xl border border-learn-border px-3 py-2.5 text-sm outline-none focus:border-learn-primary/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-learn-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              전송
            </button>
          </form>
        </div>
      )}
    </>
  );
}
