"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsPage } from "@/lib/content";
import {
  FORWARDING_OVERFLOW_SUMMARY,
  FORWARDING_EFFIROAD_MAIN_SUMMARY,
  FORWARDING_AFTER_HOURS_NOTE,
  isDirectEffiroadLineProvider,
  FORWARDING_PROVIDERS,
  FORWARDING_PROVIDER_NOTE,
  FORWARDING_TROUBLESHOOTING,
  FORWARDING_TROUBLESHOOTING_FALLBACK,
  FORWARDING_TROUBLESHOOTING_SWITCH_NOTE,
  getForwardingGuideSteps,
  normalizeForwardingProvider,
  type ForwardingProviderId,
  type LegacyForwardingScenarioId,
} from "@/lib/forwarding-guides";
import { ForwardingUnblockGuide } from "@/components/settings/ForwardingUnblockGuide";
import { ForwardingConditionMatrix } from "@/components/settings/ForwardingConditionMatrix";
import { ForwardingOneTapSetup } from "@/components/settings/ForwardingOneTapSetup";
import { ForwardingTestPanel } from "@/components/settings/ForwardingTestPanel";
import { TrialForwardingBanner } from "@/components/settings/TrialForwardingBanner";
import { ForwardingPathPicker } from "@/components/settings/ForwardingPathPicker";
import { ForwardingAlternatePaths } from "@/components/settings/ForwardingAlternatePaths";
import { EffiroadDedicatedLineCard } from "@/components/settings/EffiroadDedicatedLineCard";
import { DialpadRoutingVisual } from "@/components/settings/DialpadRoutingVisual";
import type { ForwardingSetupPathId } from "@/lib/forwarding-paths";

type ForwardingSetupProps = {
  confirmed: boolean;
  onConfirm?: () => void;
  batchSave?: boolean;
  hideConfirmedBanner?: boolean;
  confirmDisabled?: boolean;
  initialScenario?: LegacyForwardingScenarioId;
  initialProvider?: string;
  onPreferencesChange?: (prefs: {
    scenario: "overflow";
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
  batchSave = false,
  hideConfirmedBanner = false,
  confirmDisabled = false,
  initialProvider: rawInitialProvider = "effiroad_main",
  onPreferencesChange,
}: ForwardingSetupProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ForwardingProviderId>(
    normalizeForwardingProvider(rawInitialProvider),
  );
  const [copied, setCopied] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [forwardingVerified, setForwardingVerified] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [selectedPath, setSelectedPath] = useState<ForwardingSetupPathId | null>(null);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [testAttempted, setTestAttempted] = useState(false);

  const WIZARD_STEPS = [
    { n: 1, label: "Your number" },
    { n: 2, label: "Setup guide" },
    { n: 3, label: "Test call" },
  ] as const;

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
    onPreferencesChange?.({ scenario: "overflow", provider });
    setForwardingVerified(false);
    setTestAttempted(false);
  }, [provider, onPreferencesChange]);

  useEffect(() => {
    if (phoneNumber && wizardStep === 1) {
      setWizardStep(2);
    }
  }, [phoneNumber, wizardStep]);

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

  const guideSteps = getForwardingGuideSteps(provider, "overflow", phoneNumber ?? "");
  const providerMeta = FORWARDING_PROVIDERS.find((p) => p.id === provider);
  const providerLabel = providerMeta?.label ?? "";
  const directMain = isDirectEffiroadLineProvider(provider);
  const setupSummary = directMain ? FORWARDING_EFFIROAD_MAIN_SUMMARY : FORWARDING_OVERFLOW_SUMMARY;

  const visibleProviders = showAllProviders
    ? FORWARDING_PROVIDERS
    : providerMeta
      ? [providerMeta]
      : FORWARDING_PROVIDERS;

  function handlePathSelect(nextProvider: ForwardingProviderId, pathId: ForwardingSetupPathId) {
    setProvider(nextProvider);
    setSelectedPath(pathId);
    setQuizDone(true);
    setShowAllProviders(pathId === "quiz");
  }

  function switchToDedicatedLine() {
    handlePathSelect("effiroad_main", "dedicated_line");
    setWizardStep(2);
  }

  return (
    <div className="space-y-5 text-slate-900">
      <TrialForwardingBanner />

      <nav aria-label="Forwarding setup progress" className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((s) => {
          const active = wizardStep === s.n;
          const done = wizardStep > s.n;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => phoneNumber && setWizardStep(s.n)}
              disabled={!phoneNumber && s.n > 1}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-brand-600 text-white"
                  : done
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-500"
              } disabled:opacity-40`}
            >
              {s.n}. {s.label}
            </button>
          );
        })}
      </nav>

      {wizardStep === 1 ? (
        <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {settingsPage.forwardingNumberLabel}
          </p>
          <p className="mt-1 text-base text-stone-600">{settingsPage.forwardingNumberHint}</p>
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
      ) : null}

      {wizardStep === 2 ? (
        <>
          {!quizDone ? (
            <ForwardingPathPicker phoneNumber={phoneNumber} onSelect={handlePathSelect} />
          ) : null}

          {quizDone ? (
            <>
          {selectedPath && selectedPath !== "dedicated_line" ? (
            <ForwardingAlternatePaths
              current={provider}
              onSwitch={(id) => handlePathSelect(id, id === "effiroad_main" ? "dedicated_line" : selectedPath)}
            />
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="vow-settings-label">{settingsPage.forwardingWhatYouAreSetting}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{setupSummary}</p>
            {!directMain ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{FORWARDING_AFTER_HOURS_NOTE}</p>
            ) : null}
          </div>

          {!directMain ? <ForwardingConditionMatrix /> : null}

          {directMain && phoneNumber ? (
            <EffiroadDedicatedLineCard phoneNumber={phoneNumber} variant="promo" />
          ) : null}

          <div>
            <p className="vow-settings-label">{settingsPage.forwardingProviderTitle}</p>
            <p className="vow-settings-hint mt-1 text-sm">{settingsPage.forwardingProviderHint}</p>
            {!showAllProviders ? (
              <button
                type="button"
                onClick={() => {
                  setQuizDone(false);
                  setSelectedPath(null);
                }}
                className="mt-2 text-sm font-semibold text-brand-700 underline"
              >
                {settingsPage.forwardingChangePath}
              </button>
            ) : null}
            {provider === "dialpad" ? (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
                {settingsPage.forwardingDialpadBanner}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visibleProviders.map((item) => {
                const selected = provider === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProvider(item.id)}
                    className={`min-h-[52px] rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
                      selected
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                        : item.recommended
                          ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
                          : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-base font-semibold ${selected ? "text-brand-900" : "text-slate-800"}`}
                      >
                        {item.label}
                      </span>
                      {item.recommended ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800">
                          {settingsPage.forwardingRecommendedProvider}
                        </span>
                      ) : null}
                    </span>
                    <p className="mt-1 text-sm text-stone-600">{item.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {provider === "verizon" && !directMain ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              {settingsPage.forwardingVerizonWarning}
            </p>
          ) : null}

          {provider === "google_voice" && !directMain ? (
            <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-950">
              {settingsPage.forwardingGoogleVoiceWarning}
            </p>
          ) : null}

          {provider === "dialpad" && phoneNumber ? <DialpadRoutingVisual /> : null}

          {phoneNumber ? (
            <ForwardingOneTapSetup provider={provider} phoneNumber={phoneNumber} />
          ) : null}

          {phoneNumber ? (
            <ForwardingUnblockGuide provider={provider} effiroadNumber={phoneNumber} />
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="vow-settings-label">{settingsPage.forwardingStepsTitle}</p>
            <p className="mt-1 text-sm text-stone-600">{providerLabel}</p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-slate-800">
              {guideSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">{FORWARDING_PROVIDER_NOTE}</p>
          </div>

          {!directMain && phoneNumber ? (
            <EffiroadDedicatedLineCard
              phoneNumber={phoneNumber}
              variant="fallback"
              onSwitchToDedicated={switchToDedicatedLine}
            />
          ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {wizardStep === 3 ? (
        <>
          <ForwardingTestPanel
            provider={provider}
            onVerified={() => setForwardingVerified(true)}
            onTestStarted={() => setTestAttempted(true)}
          />

          {testAttempted && !forwardingVerified && !directMain && phoneNumber ? (
            <EffiroadDedicatedLineCard
              phoneNumber={phoneNumber}
              variant="fallback"
              onSwitchToDedicated={switchToDedicatedLine}
            />
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setStuckOpen((open) => !open)}
              aria-expanded={stuckOpen}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-slate-800 sm:px-5"
            >
              Stuck?
              <span
                className={`text-slate-400 transition-transform ${stuckOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            {stuckOpen ? (
              <div className="space-y-3 border-t border-slate-200 px-4 py-4 sm:px-5">
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                  {FORWARDING_TROUBLESHOOTING[provider].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
                <p className="text-sm leading-relaxed text-slate-600">
                  {FORWARDING_TROUBLESHOOTING_SWITCH_NOTE[provider]}
                </p>
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-900">
                  {FORWARDING_TROUBLESHOOTING_FALLBACK}
                </p>
                {!directMain && phoneNumber ? (
                  <EffiroadDedicatedLineCard
                    phoneNumber={phoneNumber}
                    variant="fallback"
                    compact
                    onSwitchToDedicated={switchToDedicatedLine}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {confirmed && !hideConfirmedBanner ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-900">
              {settingsPage.phoneConfirmed}
            </p>
          ) : batchSave ? (
            <p className="text-base text-stone-600">{settingsPage.saveAllHint}</p>
          ) : (
            <button
              type="button"
              disabled={confirmDisabled || !phoneNumber || !forwardingVerified}
              onClick={onConfirm}
              className="vow-dash-btn-primary w-full px-4 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {settingsPage.phoneConfirm}
            </button>
          )}
          {!phoneNumber && !loading ? (
            <p className="text-center text-xs text-slate-500">{settingsPage.forwardingConfirmBlocked}</p>
          ) : !forwardingVerified && phoneNumber ? (
            <p className="text-center text-xs text-amber-800">{settingsPage.forwardingVerifyRequired}</p>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {wizardStep > 1 ? (
          <button
            type="button"
            onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            ← Back
          </button>
        ) : null}
        {wizardStep < 3 && phoneNumber ? (
          <button
            type="button"
            onClick={() => setWizardStep((s) => Math.min(3, s + 1))}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Next →
          </button>
        ) : null}
      </div>
    </div>
  );
}
