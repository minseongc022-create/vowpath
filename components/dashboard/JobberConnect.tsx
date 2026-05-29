"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jobberConnect as copy } from "@/lib/content";
import { readShopState, writeShopState } from "@/lib/shop-storage";

type Status = {
  configured: boolean;
  connected: boolean;
  accountName: string | null;
  redirectUri?: string | null;
  developerPortalUrl?: string | null;
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
  const [copied, setCopied] = useState(false);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/jobber/status");
      if (!res.ok) {
        setStatus({ configured: false, connected: false, accountName: null });
        onStatusChangeRef.current?.(false);
        return;
      }
      const data = (await res.json()) as Status;
      setStatus(data);
      const freshConnect =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("jobber") === "connected";
      onStatusChangeRef.current?.(data.connected, { freshConnect });
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
      onStatusChangeRef.current?.(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jobber") === "connected" || params.has("jobber_error")) {
      void load({ silent: true });
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
      await load({ silent: true });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleCopyRedirect() {
    if (!status?.redirectUri) return;
    await navigator.clipboard.writeText(status.redirectUri);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading && !status) {
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

      {s.configured && s.redirectUri && !s.connected ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">{copy.redirectSetupTitle}</p>
          <p className="mt-1 text-xs text-amber-900/90">{copy.redirectSetupBody}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800">
              {s.redirectUri}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyRedirect()}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100"
            >
              {copied ? copy.redirectSetupCopied : copy.redirectSetupCopy}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-900/80">{copy.redirectSetupNote}</p>
          {s.developerPortalUrl ? (
            <a
              href={s.developerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:underline"
            >
              {copy.redirectSetupLink} →
            </a>
          ) : null}
        </div>
      ) : null}

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
