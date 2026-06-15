"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsPage } from "@/lib/content";
import {
  FORWARDING_PROVIDERS,
  FORWARDING_PROVIDER_NOTE,
  FORWARDING_SCENARIOS,
  getForwardingGuideSteps,
  normalizeForwardingScenario,
  type ForwardingProviderId,
  type ForwardingScenarioId,
  type LegacyForwardingScenarioId,
} from "@/lib/forwarding-guides";

type ForwardingSetupProps = {
  confirmed: boolean;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  initialScenario?: LegacyForwardingScenarioId;
  initialProvider?: ForwardingProviderId;
  onPreferencesChange?: (prefs: {
    scenario: ForwardingScenarioId;
    provider: ForwardingProviderId;
  }) => void;
};

function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const n = digits.slice(1);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return e164;
}

export function ForwardingSetup({
  confirmed,
  onConfirm,
  confirmDisabled = false,
  initialScenario: rawInitialScenario = "overflow",
  initialProvider = "dialpad",
  onPreferencesChange,
}: ForwardingSetupProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const initialScenario = normalizeForwardingScenario(rawInitialScenario);
  const [scenario, setScenario] = useState<ForwardingScenarioId>(initialScenario);
  const [provider, setProvider] = useState<ForwardingProviderId>(initialProvider);
  const [copied, setCopied] = useState(false);

  const loadPhoneStatus = useCallback(async () => {
    const res = await fetch("/api/phone/status");
    const d = (await res.json()) as {
      phoneNumber?: string | null;
      twilioConfigured?: boolean;
    };
    const num = d.phoneNumber?.trim() ?? null;
    setPhoneNumber(num);
    return { num, twilioConfigured: Boolean(d.twilioConfigured) };
  }, []);

  const runProvision = useCallback(async () => {
    setProvisioning(true);
    setProvisionError(null);
    try {
      const res = await fetch("/api/phone/provision", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; phoneNumber?: string; error?: string };
      if (!res.ok || !data.phoneNumber) {
        setProvisionError(data.error ?? settingsPage.forwardingNumberProvisionFailed);
        return;
      }
      setPhoneNumber(data.phoneNumber);
    } catch {
      setProvisionError(settingsPage.forwardingNumberProvisionFailed);
    } finally {
      setProvisioning(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { num, twilioConfigured } = await loadPhoneStatus();
        if (!num && twilioConfigured) {
          await runProvision();
        }
      } catch {
        setPhoneNumber(null);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    onPreferencesChange?.({ scenario, provider });
  }, [scenario, provider, onPreferencesChange]);

  const copyNumber = useCallback(async () => {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [phoneNumber]);

  const guideSteps = getForwardingGuideSteps(provider, scenario, phoneNumber ?? "");
  const activeScenario = FORWARDING_SCENARIOS.find((s) => s.id === scenario)!;

  return (
    <div className="space-y-5 text-slate-900">
      <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {settingsPage.forwardingNumberLabel}
        </p>
        <p className="mt-1 text-sm text-slate-600">{settingsPage.forwardingNumberHint}</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">{settingsPage.forwardingNumberLoading}</p>
        ) : phoneNumber ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">
              {formatPhoneDisplay(phoneNumber)}
            </p>
            <button
              type="button"
              onClick={copyNumber}
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
            >
              {copied ? settingsPage.forwardingCopied : settingsPage.forwardingCopy}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {provisioning
                ? settingsPage.forwardingNumberProvisioning
                : settingsPage.forwardingNumberMissing}
            </p>
            {provisionError ? (
              <p className="text-sm text-rose-700">{provisionError}</p>
            ) : null}
            <button
              type="button"
              disabled={provisioning}
              onClick={() => void runProvision()}
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50 disabled:opacity-50"
            >
              {provisioning
                ? settingsPage.forwardingNumberProvisioning
                : settingsPage.forwardingNumberProvision}
            </button>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">{settingsPage.forwardingCustomerNote}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">{settingsPage.forwardingScenarioTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{settingsPage.forwardingScenarioHint}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-1">
          {FORWARDING_SCENARIOS.map((item) => {
            const selected = scenario === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenario(item.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${selected ? "text-brand-900" : "text-slate-800"}`}
                  >
                    {item.label}
                  </span>
                  {item.recommended ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      {settingsPage.forwardingRecommended}
                    </span>
                  ) : null}
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.summary}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">{settingsPage.forwardingProviderTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{settingsPage.forwardingProviderHint}</p>
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-900">
          {settingsPage.forwardingDialpadBanner}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {FORWARDING_PROVIDERS.map((item) => {
            const selected = provider === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setProvider(item.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                    : item.recommended
                      ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-sm font-semibold ${selected ? "text-brand-900" : "text-slate-800"}`}
                  >
                    {item.label}
                  </span>
                  {item.recommended ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      {settingsPage.forwardingRecommendedProvider}
                    </span>
                  ) : null}
                </span>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {provider === "carrier" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
          {settingsPage.forwardingCarrierWarning}
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{settingsPage.forwardingStepsTitle}</p>
        <p className="mt-1 text-xs text-slate-600">
          {activeScenario.label} · {FORWARDING_PROVIDERS.find((p) => p.id === provider)?.label}
        </p>
        <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-slate-800">
          {guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">{FORWARDING_PROVIDER_NOTE}</p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-900">{settingsPage.forwardingTestTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
          {settingsPage.forwardingTestBody}
        </p>
      </div>

      {confirmed ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {settingsPage.phoneConfirmed}
        </p>
      ) : (
        <button
          type="button"
          disabled={confirmDisabled || !phoneNumber}
          onClick={onConfirm}
          className="hvac-btn-primary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {settingsPage.phoneConfirm}
        </button>
      )}
      {!phoneNumber && !loading ? (
        <p className="text-center text-xs text-slate-500">{settingsPage.forwardingConfirmBlocked}</p>
      ) : null}
    </div>
  );
}
