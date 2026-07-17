"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsPage } from "@/lib/content";
import {
  FORWARDING_TROUBLESHOOTING,
  FORWARDING_TROUBLESHOOTING_FALLBACK,
  FORWARDING_TROUBLESHOOTING_SWITCH_NOTE,
  isDirectEffiroadLineProvider,
  FORWARDING_PROVIDERS,
  getForwardingGuideSteps,
  normalizeForwardingProvider,
  type ForwardingProviderId,
  type LegacyForwardingScenarioId,
} from "@/lib/forwarding-guides";
import { ForwardingUnblockGuide } from "@/components/settings/ForwardingUnblockGuide";
import { ForwardingOneTapSetup } from "@/components/settings/ForwardingOneTapSetup";
import { ForwardingTestPanel } from "@/components/settings/ForwardingTestPanel";
import { TrialForwardingBanner } from "@/components/settings/TrialForwardingBanner";
import { ForwardingPathPicker } from "@/components/settings/ForwardingPathPicker";
import { ForwardingPathQuiz } from "@/components/settings/ForwardingPathQuiz";
import { ForwardingYourSetupCard } from "@/components/settings/ForwardingYourSetupCard";
import { ForwardingAlternatePaths } from "@/components/settings/ForwardingAlternatePaths";
import { EffiroadDedicatedLineCard } from "@/components/settings/EffiroadDedicatedLineCard";
import { DialpadRoutingVisual } from "@/components/settings/DialpadRoutingVisual";
import { EffiroadNumberBanner } from "@/components/settings/EffiroadNumberBanner";
import { ForwardingSimpleSteps } from "@/components/settings/ForwardingSimpleSteps";
import { ForwardingValueHero } from "@/components/settings/ForwardingValueHero";
import type { ForwardingSetupPathId } from "@/lib/forwarding-paths";
import type { ForwardingQuizAnswers } from "@/lib/forwarding-quiz";

type SetupMode = "quiz" | "manual";

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
  const [stuckOpen, setStuckOpen] = useState(false);
  const [moreHelpOpen, setMoreHelpOpen] = useState(true);
  const initialNormalized = normalizeForwardingProvider(rawInitialProvider);
  const [quizDone, setQuizDone] = useState(
    () => initialNormalized !== "effiroad_main" || confirmed,
  );
  const [selectedPath, setSelectedPath] = useState<ForwardingSetupPathId | null>(() =>
    initialNormalized === "effiroad_main" ? null : "quiz",
  );
  const [wizardStep, setWizardStep] = useState(() => (confirmed ? 2 : 1));
  const [forwardingVerified, setForwardingVerified] = useState(false);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [testAttempted, setTestAttempted] = useState(false);
  const initialSetupMode: SetupMode =
    initialNormalized === "effiroad_main" && !confirmed ? "quiz" : "manual";
  const [quizAnswers, setQuizAnswers] = useState<ForwardingQuizAnswers | null>(null);
  const [setupMode, setSetupMode] = useState<SetupMode>(initialSetupMode);

  const WIZARD_STEPS = [
    { n: 1, label: settingsPage.forwardingWizardSteps.setUp },
    { n: 2, label: settingsPage.forwardingWizardSteps.testCall },
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

  const guideSteps = getForwardingGuideSteps(provider, "overflow", phoneNumber ?? "");
  const providerMeta = FORWARDING_PROVIDERS.find((p) => p.id === provider);
  const directMain = isDirectEffiroadLineProvider(provider);

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
    setSetupMode(pathId === "quiz" ? "quiz" : "manual");
    setWizardStep(1);
  }

  function handleQuizResolved(nextProvider: ForwardingProviderId, answers: ForwardingQuizAnswers) {
    setQuizAnswers(answers);
    handlePathSelect(nextProvider, "quiz");
  }

  function restartQuiz() {
    setQuizDone(false);
    setQuizAnswers(null);
    setSetupMode("quiz");
    setSelectedPath(null);
    setShowAllProviders(false);
  }

  function openManualPicker() {
    setSetupMode("manual");
    setQuizDone(false);
  }

  function switchToDedicatedLine() {
    handlePathSelect("effiroad_main", "dedicated_line");
  }

  const bannerMode = directMain && quizDone ? "dedicated" : "overflow";

  const wizardNav = (
    <nav
      aria-label="Forwarding setup progress"
      className="vow-forwarding-wizard-nav flex gap-1.5 overflow-x-auto pb-0.5 sm:gap-2"
    >
      {WIZARD_STEPS.map((s) => {
        const active = wizardStep === s.n;
        const done = wizardStep > s.n;
        const canJump = phoneNumber && (s.n === 1 || quizDone);
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => canJump && setWizardStep(s.n)}
            disabled={!canJump}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
              active
                ? "bg-brand-600 text-white"
                : done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
            } disabled:opacity-40`}
          >
            {s.n}. {s.label}
          </button>
        );
      })}
    </nav>
  );

  const numberBlock =
    loading ? (
      <p className="rounded-xl border border-slate-200 bg-white p-3 text-base text-slate-500">
        {settingsPage.forwardingNumberLoading}
      </p>
    ) : phoneNumber ? (
      <EffiroadNumberBanner phoneNumber={phoneNumber} mode={bannerMode} layout="bar" />
    ) : (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-base text-amber-900">
          {provisioning
            ? settingsPage.forwardingNumberProvisioning
            : settingsPage.forwardingNumberMissing}
        </p>
        {provisionError ? <p className="mt-2 text-sm text-rose-700">{provisionError}</p> : null}
        <button
          type="button"
          disabled={provisioning}
          onClick={() => void runProvision()}
          className="mt-3 rounded-lg border border-brand-300 bg-white px-4 py-2 text-base font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-50"
        >
          {provisioning
            ? settingsPage.forwardingNumberProvisioning
            : settingsPage.forwardingNumberProvision}
        </button>
      </div>
    );

  const setupInstructions =
    wizardStep === 1 ? (
      <>
        {!quizDone && setupMode === "quiz" ? (
          <>
            <p className="rounded-lg border border-brand-200 bg-brand-50/80 px-3 py-2.5 text-sm font-medium leading-snug text-brand-950 sm:text-base">
              {settingsPage.forwardingSetupPrompt}
            </p>
            <ForwardingPathQuiz
              initialProvider={provider}
              onResolved={handleQuizResolved}
              onManualPick={openManualPicker}
            />
          </>
        ) : null}

        {!quizDone && setupMode === "manual" ? (
          <>
            <p className="rounded-lg border border-brand-200 bg-brand-50/80 px-3 py-2.5 text-sm font-medium leading-snug text-brand-950 sm:text-base">
              {settingsPage.forwardingPathPicker.subtitle}
            </p>
            <ForwardingPathPicker onSelect={handlePathSelect} />
            <button
              type="button"
              onClick={restartQuiz}
              className="w-full text-center text-sm font-semibold text-brand-700 underline"
            >
              {settingsPage.forwardingPathPicker.quizFallback}
            </button>
          </>
        ) : null}

        {quizDone ? (
          <>
            <ForwardingYourSetupCard
              provider={provider}
              quizAnswers={selectedPath === "quiz" ? quizAnswers : null}
              onChangeSetup={restartQuiz}
            />

            <ForwardingPathPicker
              selectedProvider={provider}
              onChangePath={restartQuiz}
              onSelect={handlePathSelect}
            />

            {provider === "verizon" && !directMain ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-snug text-amber-950">
                {settingsPage.forwardingVerizonWarning}
              </p>
            ) : null}

            {provider === "google_voice" && !directMain ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm leading-snug text-amber-950">
                {settingsPage.forwardingGoogleVoiceWarning}
              </p>
            ) : null}

            {provider === "dialpad" && !directMain ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-snug text-emerald-900">
                {settingsPage.forwardingDialpadBanner}
              </p>
            ) : null}

            {phoneNumber ? (
              <div className="space-y-2.5">
                <ForwardingOneTapSetup provider={provider} phoneNumber={phoneNumber} />
                <ForwardingSimpleSteps steps={guideSteps} />
              </div>
            ) : null}

            {directMain && phoneNumber ? (
              <EffiroadDedicatedLineCard phoneNumber={phoneNumber} variant="promo" compact />
            ) : null}

            {!directMain && phoneNumber ? (
              <EffiroadDedicatedLineCard
                phoneNumber={phoneNumber}
                variant="fallback"
                compact
                onSwitchToDedicated={switchToDedicatedLine}
              />
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setMoreHelpOpen((open) => !open)}
                aria-expanded={moreHelpOpen}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-slate-800 sm:px-4 sm:py-3 sm:text-base"
              >
                {settingsPage.forwardingMoreHelp}
                <span
                  className={`text-slate-400 transition-transform ${moreHelpOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              {moreHelpOpen ? (
                <div className="space-y-2.5 border-t border-slate-200 px-3 py-3 sm:space-y-3 sm:px-4">
                  <ForwardingValueHero dense />
                  {selectedPath && selectedPath !== "dedicated_line" ? (
                    <ForwardingAlternatePaths
                      current={provider}
                      onSwitch={(id) =>
                        handlePathSelect(
                          id,
                          id === "effiroad_main" ? "dedicated_line" : selectedPath,
                        )
                      }
                    />
                  ) : null}
                  {!showAllProviders ? (
                    <div>
                      <p className="vow-settings-label">{settingsPage.forwardingProviderTitle}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {visibleProviders.map((item) => {
                          const selected = provider === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setProvider(item.id)}
                              className={`min-h-[48px] rounded-xl border px-3 py-2.5 text-left ${
                                selected
                                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <span className="text-sm font-semibold text-slate-900 sm:text-base">{item.label}</span>
                              <p className="mt-0.5 text-xs leading-snug text-stone-600 sm:text-sm">{item.hint}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {provider === "dialpad" && phoneNumber ? <DialpadRoutingVisual /> : null}
                  {phoneNumber ? (
                    <ForwardingUnblockGuide provider={provider} effiroadNumber={phoneNumber} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </>
    ) : null;

  return (
    <div className="vow-forwarding-setup space-y-2 text-slate-900 sm:space-y-4">
      <TrialForwardingBanner />

      <div className="vow-forwarding-sticky space-y-1.5 sm:space-y-2">
        {wizardNav}
        {numberBlock}
      </div>

      {setupInstructions}

      {wizardStep === 2 && quizDone ? (
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
              compact
              onSwitchToDedicated={switchToDedicatedLine}
            />
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-white sm:rounded-xl">
            <button
              type="button"
              onClick={() => setStuckOpen((open) => !open)}
              aria-expanded={stuckOpen}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-semibold text-slate-800 sm:px-5 sm:py-3.5 sm:text-base"
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
                <ol className="list-decimal space-y-2 pl-5 text-base leading-relaxed text-slate-700">
                  {FORWARDING_TROUBLESHOOTING[provider].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
                <p className="text-base leading-relaxed text-slate-600">
                  {FORWARDING_TROUBLESHOOTING_SWITCH_NOTE[provider]}
                </p>
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-base leading-relaxed text-emerald-900">
                  {FORWARDING_TROUBLESHOOTING_FALLBACK}
                </p>
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
              className="vow-dash-btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3 sm:text-base"
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

      <div className="vow-forwarding-nav flex flex-wrap gap-1.5 pt-0.5 sm:gap-2 sm:pt-1">
        {wizardStep > 1 ? (
          <button
            type="button"
            onClick={() => setWizardStep(1)}
            className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 sm:min-h-[44px] sm:px-4 sm:py-2.5 sm:text-base"
          >
            ← Back
          </button>
        ) : null}
        {wizardStep === 1 && quizDone && phoneNumber ? (
          <button
            type="button"
            onClick={() => setWizardStep(2)}
            className="min-h-9 flex-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white sm:min-h-[44px] sm:flex-none sm:px-4 sm:py-2.5 sm:text-base"
          >
            Next → {settingsPage.forwardingWizardSteps.testCall}
          </button>
        ) : null}
      </div>
    </div>
  );
}
