"use client";

import { useCallback, useEffect, useState } from "react";
import { jobberConnect as copy } from "@/lib/content";
import { readShopState, writeShopState } from "@/lib/shop-storage";

type Status = {
  configured: boolean;
  connected: boolean;
  accountName: string | null;
};

export function JobberConnect({
  embedded = false,
  onStatusChange,
}: {
  embedded?: boolean;
  onStatusChange?: (connected: boolean, meta?: { freshConnect?: boolean }) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobber/status");
      const data = (await res.json()) as Status;
      setStatus(data);
      const freshConnect =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("jobber") === "connected";
      onStatusChange?.(data.connected, { freshConnect });
      if (data.connected) {
        const shop = readShopState();
        writeShopState({
          ...shop,
          jobberConnected: true,
          jobberSetupConfirmed: freshConnect ? false : shop.jobberSetupConfirmed,
        });
      }
    } catch {
      setStatus({ configured: false, connected: false, accountName: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jobber") === "connected" || params.has("jobber_error")) {
      load();
      params.delete("jobber");
      params.delete("jobber_error");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [load]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/jobber/disconnect", { method: "POST" });
      const shop = readShopState();
      writeShopState({
        ...shop,
        jobberConnected: false,
        jobberSetupConfirmed: false,
      });
      await load();
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div
        className={
          embedded
            ? "animate-pulse space-y-2"
            : "rounded-xl border border-surface-border bg-white p-5 shadow-card animate-pulse"
        }
      >
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>
    );
  }

  const s = status ?? { configured: false, connected: false, accountName: null };

  const content = (
    <>
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-600">{copy.eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{copy.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {s.connected && s.accountName
                ? copy.connectedSubtitle.replace("{account}", s.accountName)
                : copy.subtitle}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              s.connected
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {s.connected ? copy.badgeConnected : copy.badgeDisconnected}
          </span>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {s.connected && s.accountName
            ? copy.connectedSubtitle.replace("{account}", s.accountName)
            : copy.subtitle}
        </p>
      )}

      <div className={embedded ? "mt-3 flex flex-wrap gap-3" : "mt-4 flex flex-wrap gap-3"}>
        {!s.connected ? (
          <a
            href={s.configured ? "/api/jobber/connect" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              s.configured
                ? "hvac-btn-primary"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            }`}
            aria-disabled={!s.configured}
            onClick={(e) => {
              if (!s.configured) e.preventDefault();
            }}
          >
            {copy.connect}
          </a>
        ) : (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {disconnecting ? copy.disconnecting : copy.disconnect}
          </button>
        )}
      </div>

      {!s.configured ? (
        <p className="mt-3 text-xs text-amber-800">{copy.notConfigured}</p>
      ) : null}
    </>
  );

  if (embedded) return content;

  return (
    <section className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
      {content}
    </section>
  );
}
