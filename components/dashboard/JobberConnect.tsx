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
  accountId?: string | null;
  accountEmail?: string | null;
  accountPhone?: string | null;
  connectedAt?: string | null;
  redirectUri?: string | null;
  recommendedCallbackUris?: string[];
  productionCallbackUri?: string | null;
  clientId?: string | null;
  developerPortalUrl?: string | null;
  invoiceAccess?: {
    ok: boolean;
    error?: string;
    reconnectRecommended: boolean;
  } | null;
};

function formatConnectedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [callbackSaved, setCallbackSaved] = useState(false);
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
    const err = params.get("jobber_error");
    if (err) setOauthError(err);
    if (params.get("jobber") === "connected" || params.has("jobber_error")) {
      void load({ silent: true });
      params.delete("jobber");
      params.delete("jobber_error");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [load]);

  function oauthErrorMessage(code: string): string {
    if (code === "redirect_localhost") return copy.oauthErrorRedirectLocalhost;
    if (code === "redirect_missing") return copy.oauthErrorRedirectMissing;
    if (code === "not_configured") return copy.oauthErrorNotConfigured;
    return copy.oauthErrorGeneric;
  }

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
      {oauthError ? (
        <div
          className={`rounded-xl border border-rose-200 bg-rose-50 text-rose-950 ${
            isSettings ? "mb-4 px-4 py-3 text-sm" : "mb-4 px-4 py-3 text-xs"
          }`}
        >
          <p className="font-semibold">Jobber connection error</p>
          <p className="mt-1 leading-relaxed">{oauthErrorMessage(oauthError)}</p>
        </div>
      ) : null}

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
              {s.connected
                ? s.accountName
                  ? copy.connectedSubtitle.replace("{account}", s.accountName)
                  : copy.connectedPendingAccount
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
          className={`rounded-xl border-2 border-amber-400 bg-amber-50 shadow-sm ${
            isSettings ? "mt-4 p-5" : "mt-4 p-4"
          }`}
        >
          <p className={`font-bold text-amber-950 ${isSettings ? "text-base" : "text-sm"}`}>
            {copy.redirectSetupTitle}
          </p>
          <p className={`mt-1 text-amber-950/90 ${isSettings ? "text-sm" : "text-xs"}`}>
            {copy.redirectSetupBody}
          </p>
          <ol
            className={`mt-3 list-decimal space-y-2 pl-5 text-amber-950 ${
              isSettings ? "text-sm" : "text-xs"
            }`}
          >
            <li>
              Open{" "}
              {s.developerPortalUrl ? (
                <a
                  href={s.developerPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Jobber Developer Center
                </a>
              ) : (
                "Jobber Developer Center"
              )}{" "}
              and select the app whose Client ID is{" "}
              <code className="rounded bg-white px-1 font-mono text-[0.9em]">
                {s.clientId ?? "…"}
              </code>
              .
            </li>
            <li>
              Paste this <strong>exact</strong> OAuth Callback URL (no spaces, no extra slash), then{" "}
              <strong>Save</strong>:
            </li>
          </ol>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code
              className={`flex-1 break-all rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-slate-900 ${
                isSettings ? "text-sm" : "text-xs"
              }`}
            >
              {s.redirectUri}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyRedirect()}
              className={`rounded-lg border border-amber-400 bg-white px-3 py-2 font-semibold text-amber-950 hover:bg-amber-100 ${
                isSettings ? "text-sm" : "text-xs"
              }`}
            >
              {copied ? copy.redirectSetupCopied : copy.redirectSetupCopy}
            </button>
          </div>
          {(s.recommendedCallbackUris?.length ?? 0) > 0 ? (
            <div className={`mt-3 text-amber-900/90 ${isSettings ? "text-sm" : "text-xs"}`}>
              <p className="font-semibold text-amber-950">{copy.redirectAlsoRegister}</p>
              <ul className="mt-1 space-y-1 font-mono text-[0.9em]">
                {s.recommendedCallbackUris!.map((uri) => (
                  <li key={uri} className="break-all">
                    {uri}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className={`mt-3 text-amber-900/90 ${isSettings ? "text-sm" : "text-xs"}`}>
            {copy.redirectSetupNote}
          </p>
          {s.clientId ? (
            <p className={`mt-2 text-amber-900/90 ${isSettings ? "text-sm" : "text-xs"}`}>
              {copy.redirectSetupClientId.replace("{clientId}", s.clientId)}
            </p>
          ) : null}
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-300 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={callbackSaved}
              onChange={(e) => setCallbackSaved(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400"
            />
            <span className={`font-medium text-amber-950 ${isSettings ? "text-sm" : "text-xs"}`}>
              {copy.redirectConfirmCheckbox}
            </span>
          </label>
        </div>
      ) : null}

      {s.connected ? (
        <div
          className={`rounded-xl border border-emerald-200 bg-emerald-50/80 ${
            isSettings ? "mt-4 px-4 py-4" : "mt-4 px-4 py-3"
          }`}
        >
          <p className={`font-semibold text-emerald-950 ${isSettings ? "text-base" : "text-sm"}`}>
            {copy.connectedAccountTitle}
          </p>
          {s.accountName || s.accountEmail || s.accountId || s.accountPhone ? (
            <dl
              className={`mt-3 grid gap-2 ${
                isSettings ? "text-sm sm:grid-cols-2" : "text-xs"
              }`}
            >
              {s.accountName ? (
                <div>
                  <dt className="font-medium text-emerald-900/80">{copy.connectedCompanyLabel}</dt>
                  <dd className="mt-0.5 font-semibold text-emerald-950">{s.accountName}</dd>
                </div>
              ) : null}
              {s.accountEmail ? (
                <div>
                  <dt className="font-medium text-emerald-900/80">{copy.connectedEmailLabel}</dt>
                  <dd className="mt-0.5 break-all font-semibold text-emerald-950">
                    {s.accountEmail}
                  </dd>
                </div>
              ) : null}
              {s.accountPhone ? (
                <div>
                  <dt className="font-medium text-emerald-900/80">{copy.connectedPhoneLabel}</dt>
                  <dd className="mt-0.5 font-semibold text-emerald-950">{s.accountPhone}</dd>
                </div>
              ) : null}
              {s.accountId ? (
                <div className={isSettings ? "sm:col-span-2" : undefined}>
                  <dt className="font-medium text-emerald-900/80">{copy.connectedIdLabel}</dt>
                  <dd className="mt-0.5 break-all font-mono text-[0.85em] text-emerald-950">
                    {s.accountId}
                  </dd>
                </div>
              ) : null}
              {formatConnectedAt(s.connectedAt) ? (
                <div>
                  <dt className="font-medium text-emerald-900/80">{copy.connectedAtLabel}</dt>
                  <dd className="mt-0.5 font-semibold text-emerald-950">
                    {formatConnectedAt(s.connectedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className={`mt-2 text-emerald-900/90 ${isSettings ? "text-sm" : "text-xs"}`}>
              {copy.connectedPendingAccount}
            </p>
          )}
        </div>
      ) : null}

      {s.connected && s.invoiceAccess ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            s.invoiceAccess.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : s.invoiceAccess.reconnectRecommended
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {s.invoiceAccess.ok
            ? copy.invoiceAccessOk
            : s.invoiceAccess.reconnectRecommended
              ? copy.invoiceAccessReconnect
              : copy.invoiceAccessError}
        </div>
      ) : null}

      <div className={isSettings ? "mt-4 flex flex-wrap gap-3" : "mt-4 flex flex-wrap gap-3"}>
        {!s.connected ? (
          <a
            href={s.configured && callbackSaved ? "/api/jobber/connect" : undefined}
            className={`font-semibold ${
              isSettings ? "rounded-xl px-6 py-3.5 text-base" : "rounded-lg px-4 py-2 text-sm"
            } ${
              s.configured && callbackSaved
                ? "hvac-btn-primary"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            }`}
            aria-disabled={!s.configured || !callbackSaved}
            onClick={(e) => {
              if (!s.configured || !callbackSaved) e.preventDefault();
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

      {!s.connected && s.configured && !callbackSaved ? (
        <p className={`mt-2 text-amber-800 ${isSettings ? "text-sm" : "text-xs"}`}>
          {copy.redirectConfirmHint}
        </p>
      ) : null}

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
