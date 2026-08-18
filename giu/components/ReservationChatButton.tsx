"use client";

import { useCallback, useEffect, useState } from "react";
import { ReservationChatSheet } from "@/giu/components/ReservationChatSheet";
import { telHref } from "@/giu/lib/freshness";
import { hapticSelect } from "@/giu/lib/haptics";
import { chatCallLabel, chatOpenLabel, t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuAccountRole } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  viewerRole: GiuAccountRole;
  peerName: string;
  peerPhone?: string;
  compact?: boolean;
};

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

export function ReservationChatButton({
  locale,
  reservationId,
  viewerRole,
  peerName,
  peerPhone,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/messages`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: number };
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, [reservationId]);

  useEffect(() => {
    void refreshUnread();
    if (open) return;
    const id = window.setInterval(() => void refreshUnread(), 12_000);
    return () => window.clearInterval(id);
  }, [refreshUnread, open]);

  const tel = peerPhone ? telHref(peerPhone) : "";
  const label = chatOpenLabel(locale, viewerRole);

  return (
    <>
      <div className={`flex gap-2 ${compact ? "" : "w-full"}`}>
        <button
          type="button"
          onClick={() => {
            hapticSelect();
            setOpen(true);
          }}
          className={
            compact
              ? "giu-btn-secondary giu-btn-3d relative min-w-0 flex-1 !py-2 text-[12px]"
              : "giu-btn-secondary giu-btn-3d relative min-w-0 flex-1 !py-2.5 text-[13px]"
          }
        >
          {label}
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-giu-gold px-1 text-[10px] font-bold text-giu-ink">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
        {tel ? (
          <a
            href={tel}
            className={
              compact
                ? "giu-btn-secondary giu-btn-3d flex h-[38px] w-[44px] shrink-0 items-center justify-center !p-0"
                : "giu-btn-secondary giu-btn-3d flex h-[42px] w-[48px] shrink-0 items-center justify-center !p-0"
            }
            aria-label={chatCallLabel(locale, viewerRole)}
          >
            <PhoneIcon />
          </a>
        ) : null}
      </div>

      <ReservationChatSheet
        locale={locale}
        reservationId={reservationId}
        viewerRole={viewerRole}
        peerName={peerName}
        peerPhone={peerPhone}
        open={open}
        onClose={() => setOpen(false)}
        onRead={() => {
          setUnread(0);
          void refreshUnread();
        }}
      />
    </>
  );
}
