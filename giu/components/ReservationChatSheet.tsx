"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { telHref } from "@/giu/lib/freshness";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import {
  chatCallLabel,
  chatEmptyLabel,
  chatOpenLabel,
  chatTitleLabel,
  t,
} from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuAccountRole, GiuChatMessage } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  viewerRole: GiuAccountRole;
  peerName: string;
  peerPhone?: string;
  open: boolean;
  onClose: () => void;
  onRead?: () => void;
};

const POLL_MS = 4_000;

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h3l1.2 3.6-1.8 1.2a12.5 12.5 0 006.5 6.5l1.2-1.8L20 14.5V18a1.5 1.5 0 01-1.5 1.5C9.8 19.5 4.5 14.2 4.5 5.5A1.5 1.5 0 016 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReservationChatSheet({
  locale,
  reservationId,
  viewerRole,
  peerName,
  peerPhone,
  open,
  onClose,
  onRead,
}: Props) {
  const [messages, setMessages] = useState<GiuChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(
    async (markRead = false) => {
      try {
        const qs = markRead ? "?markRead=1" : "";
        const res = await fetch(`/api/giu/reservations/${reservationId}/messages${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: GiuChatMessage[] };
        setMessages(data.messages ?? []);
        if (markRead) onRead?.();
      } catch {
        /* ignore */
      }
    },
    [reservationId, onRead],
  );

  useEffect(() => {
    if (!open) return;
    void loadMessages(true);
    const id = window.setInterval(() => void loadMessages(false), POLL_MS);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(focusTimer);
    };
  }, [open, loadMessages]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages, open]);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending) return;
    hapticSelect();
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { error?: string; message?: GiuChatMessage };
      if (!res.ok) {
        setError(data.error ?? t(locale, "chatSendFail"));
        return;
      }
      hapticConfirm();
      setDraft("");
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      } else {
        await loadMessages(true);
      }
    } catch {
      setError(t(locale, "chatSendFail"));
    } finally {
      setSending(false);
    }
  }

  const tel = peerPhone ? telHref(peerPhone) : "";

  return (
    <GiuBottomSheet
      open={open}
      onClose={onClose}
      dismissLabel={t(locale, "mCloseSheet")}
      ariaLabelledBy="giu-chat-title"
    >
      <div className="giu-chat-sheet flex max-h-[min(88vh,720px)] flex-col bg-giu-bg">
        <header className="flex items-center gap-2 border-b border-giu-border/80 bg-white/90 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="giu-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] font-bold text-giu-muted"
            aria-label={t(locale, "mCloseSheet")}
          >
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="giu-chat-title" className="truncate text-[16px] font-extrabold text-giu-ink">
              {chatTitleLabel(locale, viewerRole)}
            </h2>
            <p className="truncate text-[11px] text-giu-muted">
              {peerName} · {t(locale, "chatSubtitle")}
            </p>
          </div>
          {tel ? (
            <a
              href={tel}
              className="giu-btn-3d giu-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-giu-accent-soft text-giu-primary"
              aria-label={chatCallLabel(locale, viewerRole)}
            >
              <PhoneIcon />
            </a>
          ) : null}
        </header>

        <p className="border-b border-giu-border/60 bg-giu-primary-soft/40 px-4 py-2 text-[11px] leading-snug text-giu-ink">
          {t(locale, "chatOfficialNotice")}
        </p>

        <div
          ref={listRef}
          className="giu-chat-thread giu-tab-panel-3d is-forward min-h-[240px] flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3"
        >
          {messages.length === 0 ? (
            <p className="py-12 text-center text-[13px] leading-relaxed text-giu-muted">
              {chatEmptyLabel(locale, viewerRole)}
            </p>
          ) : (
            messages.map((m, i) => {
              const mine = m.senderRole === viewerRole;
              return (
                <div
                  key={m.id}
                  className={`giu-chat-bubble-wrap flex ${mine ? "justify-end" : "justify-start"}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 24}ms` }}
                >
                  <div
                    className={`giu-chat-bubble max-w-[82%] rounded-[18px] px-3.5 py-2 text-[14px] leading-[1.45] ${
                      mine
                        ? "rounded-br-[6px] bg-giu-ink text-white shadow-[0_2px_10px_rgba(60,42,33,0.18)]"
                        : "rounded-bl-[6px] bg-white text-giu-ink shadow-[0_1px_6px_rgba(60,42,33,0.08)] ring-1 ring-giu-border/60"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <time
                      className={`mt-1 block text-[10px] font-medium ${mine ? "text-white/65" : "text-giu-muted"}`}
                      dateTime={m.createdAt}
                    >
                      {new Date(m.createdAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-giu-border/80 bg-white/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <div className="giu-chat-composer giu-btn-3d flex min-h-[44px] flex-1 items-center gap-2 rounded-full bg-giu-bg px-3 ring-1 ring-giu-border">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                placeholder={t(locale, "chatPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-giu-ink outline-none placeholder:text-giu-placeholder"
                enterKeyHint="send"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="giu-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-giu-gold text-giu-ink shadow-[0_4px_14px_rgba(249,168,37,0.35)] disabled:opacity-40"
              aria-label={t(locale, "chatSend")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 19V7M6 13l6-6 6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          {error ? <p className="mt-1.5 px-1 text-[11px] text-giu-danger">{error}</p> : null}
        </div>
      </div>
    </GiuBottomSheet>
  );
}
