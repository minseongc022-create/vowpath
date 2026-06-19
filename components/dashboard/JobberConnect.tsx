"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jobberConnect as copy } from "@/lib/content";
import { patchShopProfile } from "@/lib/shop-profile-client";
import { readShopState } from "@/lib/shop-storage";
import { notifyJobberUpdated } from "@/lib/dashboard-data-client";

type Status = {
  configured: boolean;
  connected: boolean;
  accountName: string | null;
  redirectUri?: string | null;
  developerPortalUrl?: string | null;
};

export function JobberConnect({
  embedded = false,
  variant,
  onStatusChange,
}: {
  embedded?: boolean;
  variant?: "embedded" | "settings";
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
      notifyJobberUpdated();
      if (data.connected) {
        const shop = readShopState();
        void patchShopProfile({
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
      void patchShopProfile({
        ...shop,
        jobberConnected: false,
        jobberSetupConfirmed: false,
      });
      await load({ silent: true });
      notifyJobberUpdated();
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
  const isSettings = variant === "settings" || embedded;

  const content = (
    <>
      {!isSettings ? (
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
      ) : variant === "settings" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-base font-semibold text-brand-950">
              {s.connected && s.accountName
                ? copy.connectedSubtitle.replace("{account}", s.accountName)
                : copy.subtitle}
            </p>
            {s.connected ? (
              <p className="mt-1 text-sm text-stone-600">{copy.settingsConnectedHint}</p>
            ) : (
              <p className="mt-1 text-sm text-stone-600">{copy.settingsDisconnectedHint}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              s.connected
                ? "bg-emerald-100 text-emerald-800"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {s.connected ? copy.badgeConnected : copy.badgeDisconnected}
          </span>
        </div>
      ) : (
        <p className="text-base text-stone-600">
          {s.connected && s.accountName
            ? copy.connectedSubtitle.replace("{account}", s.accountName)
            : copy.subtitle}
        </p>
      )}

      {s.configured && s.redirectUri && !s.connected ? (
        <div
          className={`rounded-xl border border-amber-200 bg-amber-50/80 shadow-sm ${
            isSettings ? "mt-4 p-5" : "mt-4 p-4"
          }`}
        >
          <p className={`font-semibold text-amber-950 ${isSettings ? "text-base" : "text-sm"}`}>
            {copy.redirectSetupTitle}
          </p>
          <p className={`mt-1 text-amber-900/90 ${isSettings ? "text-sm" : "text-xs"}`}>
            {copy.redirectSetupBody}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code
              className={`flex-1 break-all rounded-lg border border-amber-200 bg-white px-3 py-2 text-slate-800 ${
                isSettings ? "text-sm" : "text-xs"
              }`}
            >
              {s.redirectUri}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyRedirect()}
              className={`rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-950 hover:bg-amber-100 ${
                isSettings ? "text-sm" : "text-xs"
              }`}
            >
              {copied ? copy.redirectSetupCopied : copy.redirectSetupCopy}
            </button>
          </div>
          <p className={`mt-2 text-amber-900/80 ${isSettings ? "text-sm" : "text-xs"}`}>
            {copy.redirectSetupNote}
          </p>
          {s.developerPortalUrl ? (
            <a
              href={s.developerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-flex font-semibold text-brand-700 hover:underline ${
                isSettings ? "text-sm" : "text-xs"
              }`}
            >
              {copy.redirectSetupLink} →
            </a>
          ) : null}
        </div>
      ) : null}

      <div className={isSettings ? "mt-4 flex flex-wrap gap-3" : "mt-4 flex flex-wrap gap-3"}>
        {!s.connected ? (
          <a
            href={s.configured ? "/api/jobber/connect" : undefined}
            className={`font-semibold ${
              isSettings ? "rounded-xl px-6 py-3.5 text-base" : "rounded-lg px-4 py-2 text-sm"
            } ${
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
            className={`rounded-xl border border-stone-200 bg-white font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 ${
              isSettings ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"
            }`}
          >
            {disconnecting ? copy.disconnecting : copy.disconnect}
          </button>
        )}
      </div>

      {!s.configured ? (
        <p className={`mt-3 text-amber-800 ${isSettings ? "text-sm" : "text-xs"}`}>
          {copy.notConfigured}
        </p>
      ) : null}
    </>
  );

  if (embedded || variant === "settings") return content;

  return (
    <section className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
      {content}
    </section>
  );
}
