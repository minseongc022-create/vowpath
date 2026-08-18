"use client";

import { useCallback, useEffect, useState } from "react";
import { ReservationChatSheet } from "@/giu/components/ReservationChatSheet";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuAccountRole } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  viewerRole: GiuAccountRole;
  peerName: string;
  compact?: boolean;
};

export function ReservationChatButton({
  locale,
  reservationId,
  viewerRole,
  peerName,
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          hapticSelect();
          setOpen(true);
        }}
        className={
          compact
            ? "giu-btn-secondary giu-btn-3d relative !py-2 text-[12px]"
            : "giu-btn-secondary giu-btn-3d relative w-full !py-2.5 text-[13px]"
        }
      >
        {t(locale, "chatOpen")}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-giu-gold px-1 text-[10px] font-bold text-giu-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <ReservationChatSheet
        locale={locale}
        reservationId={reservationId}
        viewerRole={viewerRole}
        peerName={peerName}
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
