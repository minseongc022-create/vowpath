"use client";

import { useState } from "react";

type ChatMessage = {
  from: "visitor" | "assistant";
  text: string;
};

export function WidgetChat({ userId }: { userId: string }) {
  const [phone, setPhone] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "assistant",
      text: "Hi! Tell me what's going on and I'll get your request started. What's the best number to reach you at?",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    if (!phoneLocked) {
      if (text.replace(/\D/g, "").length < 7) {
        setError("Please enter a valid phone number first.");
        return;
      }
      setPhone(text);
      setPhoneLocked(true);
      setMessages((prev) => [
        ...prev,
        { from: "visitor", text },
        {
          from: "assistant",
          text: "Got it. Now, what can we help you with today?",
        },
      ]);
      setDraft("");
      setError(null);
      return;
    }

    setError(null);
    setMessages((prev) => [...prev, { from: "visitor", text }]);
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: text, contactPhone: phone }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        {
          from: "assistant",
          text: data.reply ?? data.error ?? "Something went wrong. Please try again.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <div className="border-b border-slate-200 bg-brand-950 px-4 py-3">
        <p className="text-sm font-semibold text-white">Chat with us</p>
        <p className="text-xs text-brand-200">Usually replies in under a minute</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "visitor" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.from === "visitor"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {sending ? (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-slate-100 px-3.5 py-2 text-sm text-slate-500">
              Typing…
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="px-4 pb-1 text-xs text-rose-600">{error}</p> : null}

      <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-3">
        <input
          type={phoneLocked ? "text" : "tel"}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSend();
          }}
          placeholder={phoneLocked ? "Type your message…" : "Your phone number"}
          disabled={sending}
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
