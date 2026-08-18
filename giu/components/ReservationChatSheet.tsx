"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuAccountRole, GiuChatMessage } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  viewerRole: GiuAccountRole;
  peerName: string;
  open: boolean;
  onClose: () => void;
  onRead?: () => void;
};

const POLL_MS = 4_000;

export function ReservationChatSheet({
  locale,
  reservationId,
  viewerRole,
  peerName,
  open,
  onClose,
  onRead,
}: Props) {
  const [messages, setMessages] = useState<GiuChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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
    return () => window.clearInterval(id);
  }, [open, loadMessages]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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

  return (
    <GiuBottomSheet
      open={open}
      onClose={onClose}
      dismissLabel={t(locale, "mCloseSheet")}
      ariaLabelledBy="giu-chat-title"
    >
      <div className="giu-chat-sheet space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="giu-chat-title" className="text-[17px] font-bold text-giu-ink">
              {t(locale, "chatTitle")}
            </h2>
            <p className="mt-0.5 text-[12px] text-giu-muted">
              {peerName} · {t(locale, "chatSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="giu-btn-3d giu-tap rounded-full px-2.5 py-1 text-[12px] font-bold text-giu-muted"
          >
            ✕
          </button>
        </div>

        <div ref={listRef} className="giu-chat-thread giu-tab-panel-3d is-forward max-h-[min(52vh,420px)] space-y-2 overflow-y-auto rounded-[18px] bg-giu-bg/80 p-3 ring-1 ring-giu-border">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-giu-muted">{t(locale, "chatEmpty")}</p>
          ) : (
            messages.map((m, i) => {
              const mine = m.senderRole === viewerRole;
              return (
                <div
                  key={m.id}
                  className={`giu-chat-bubble-wrap flex ${mine ? "justify-end" : "justify-start"}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                >
                  <div
                    className={`giu-chat-bubble giu-btn-3d max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      mine
                        ? "bg-giu-primary text-white"
                        : "bg-white text-giu-ink ring-1 ring-giu-border"
                    }`}
                  >
                    <p>{m.body}</p>
                    <time
                      className={`mt-1 block text-[10px] font-semibold ${mine ? "text-white/70" : "text-giu-muted"}`}
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

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            placeholder={t(locale, "chatPlaceholder")}
            rows={2}
            className="giu-input min-h-[44px] flex-1 resize-none py-2.5 text-[14px]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="giu-btn-primary giu-btn-3d shrink-0 !px-4 !py-3 text-[13px]"
          >
            {sending ? t(locale, "loading") : t(locale, "chatSend")}
          </button>
        </form>
        {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
      </div>
    </GiuBottomSheet>
  );
}
