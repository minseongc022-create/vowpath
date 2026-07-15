"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { settingsPage } from "@/lib/content";
import { isDirectEffiroadLineProvider, type ForwardingProviderId } from "@/lib/forwarding-guides";

type VerifyState = {
  verified: boolean;
  shopPhone?: string | null;
  effiroadNumber?: string | null;
  instruction?: string;
  waitingSince?: string;
  testMode?: "forward" | "direct";
  confidence?: "direct" | "forwarded" | "inbound_only";
  reason?: string;
};

type Props = {
  provider: ForwardingProviderId;
  onVerified?: () => void;
  onTestStarted?: () => void;
};

export function ForwardingTestPanel({ provider, onVerified, onTestStarted }: Props) {
  const [state, setState] = useState<VerifyState | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const directMain = isDirectEffiroadLineProvider(provider);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  async function startTest() {
    setError(null);
    stopPoll();
    try {
      const res = await fetch("/api/phone/forwarding-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testMode: directMain ? "direct" : "forward" }),
      });
      const data = (await res.json()) as VerifyState & { error?: string };
      if (!res.ok) {
        const msg =
          res.status === 403 && data.error?.toLowerCase().includes("subscription")
            ? "Your trial has ended or subscription is inactive. Subscribe to test forwarding again."
            : (data.error ?? "Failed");
        throw new Error(msg);
      }
      setState(data);
      setListening(true);
      onTestStarted?.();

      pollRef.current = setInterval(() => {
        void fetch("/api/phone/forwarding-verify")
          .then((r) => r.json())
          .then((d: VerifyState) => {
            setState((prev) => ({ ...prev, ...d }));
            if (d.verified) {
              stopPoll();
              onVerified?.();
            }
          })
          .catch(() => undefined);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : settingsPage.forwardingVerifyError);
    }
  }

  const testBody = directMain
    ? settingsPage.forwardingTestBodyDirect
    : settingsPage.forwardingTestBody;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-900">{settingsPage.forwardingTestTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">{testBody}</p>
      </div>

      <button
        type="button"
        onClick={() => void startTest()}
        disabled={listening && !state?.verified}
        className="w-full rounded-xl bg-brand-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {listening ? settingsPage.forwardingVerifyListening : settingsPage.forwardingVerifyStart}
      </button>

      {directMain && state?.effiroadNumber ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {settingsPage.forwardingVerifyCallEffiroad}{" "}
          <span className="font-mono font-semibold">{state.effiroadNumber}</span>
        </p>
      ) : null}

      {!directMain && state?.shopPhone ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {settingsPage.forwardingVerifyCallShop}{" "}
          <span className="font-mono font-semibold">{state.shopPhone}</span>
          {state.effiroadNumber ? (
            <>
              <br />
              <span className="text-xs text-slate-500">
                {settingsPage.forwardingVerifyNotEffiroad}{" "}
                <span className="font-mono">{state.effiroadNumber}</span>
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      {listening && !state?.verified ? (
        <p className="animate-pulse text-center text-sm font-medium text-brand-700">
          {directMain
            ? settingsPage.forwardingVerifyWaitingDirect
            : settingsPage.forwardingVerifyWaiting}
        </p>
      ) : null}

      {state?.verified ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-base font-semibold text-emerald-900">
          {state.confidence === "inbound_only"
            ? settingsPage.forwardingVerifySuccessInboundOnly
            : settingsPage.forwardingVerifySuccess}
        </p>
      ) : null}

      {state?.reason === "wrong_forward_source" ? (
        <p className="text-sm text-amber-800">
          {settingsPage.forwardingVerifyWrongForward}
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
