"use client";

import { useCallback, useEffect, useState } from "react";
import { orderStatusLabelKo } from "@/giu/lib/order-status";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import type { GiuOrderStatusLog } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservationId: string;
};

const ROLE_LABEL_KO: Record<GiuOrderStatusLog["changedByRole"], string> = {
  customer: "고객",
  merchant: "가게",
  system: "시스템",
  admin: "관리자",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderStatusTimeline({ locale, reservationId }: Props) {
  const [logs, setLogs] = useState<GiuOrderStatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/order-action`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { logs?: GiuOrderStatusLog[] };
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-[12px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-[14px] bg-giu-bg/70 p-3 ring-1 ring-giu-border">
      <p className="text-[13px] font-bold text-giu-ink">{t(locale, "orderStatusTimeline")}</p>
      <ol className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="border-l-2 border-giu-primary/25 pl-3">
            <p className="text-[12px] font-bold text-giu-ink">
              {log.fromStatus ? orderStatusLabelKo(log.fromStatus) : "—"} →{" "}
              {orderStatusLabelKo(log.toStatus)}
            </p>
            <p className="text-[11px] text-giu-muted">
              {formatWhen(log.changedAt)} · {ROLE_LABEL_KO[log.changedByRole]}
              {log.reason ? ` · ${log.reason}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
