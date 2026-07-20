"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VISIBLE_SHOP_VERTICALS, type ShopVertical } from "@/lib/shop-vertical";
import { getVerticalConfig } from "@/lib/vertical-config";
import { JobberSettingsPanel } from "@/components/settings/JobberSettingsPanel";
import { ForwardingSetup } from "@/components/settings/ForwardingSetup";
import { BillingStatusBanner } from "@/components/settings/BillingStatusBanner";
import { TestModeToggle } from "@/components/settings/TestModeToggle";
import { ShopPreferencesPanel } from "@/components/settings/ShopPreferencesPanel";
import { OwnerContactSetup } from "@/components/settings/OwnerContactSetup";
import { GoLiveWizard, type GoLiveWizardStep } from "@/components/settings/GoLiveWizard";
import { GoLiveProgressCard } from "@/components/settings/GoLiveProgressCard";
import { SettingsUiVersion } from "@/components/settings/SettingsUiVersion";
import {
  SettingsSaveProvider,
  useSettingsSaveAll,
  useSettingsSaveRegistration,
  useSettingsSaveStep,
} from "@/components/settings/SettingsSaveContext";
import { SettingsSaveButton } from "@/components/settings/SettingsSaveButton";
import { GuidedTour } from "@/components/shared/GuidedTour";
import { getSettingsTourSteps } from "@/lib/guided-tour-steps";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { ROUTES, SITE } from "@/lib/constants";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  countRequiredComplete,
  countRequiredTotal,
  getIntegrationItems,
  isFullyLive,
} from "@/lib/integration-status";
import {
  alwaysOnScheduleRow,
  defaultScheduleRows,
  isAlwaysOnFromWindows,
  parseRowsFromStored,
} from "@/lib/schedule-format";
import {
  canSaveSchedule,
  markForwardingDone,
  markJobberConfirmed,
  markJobberSkipped,
  saveSchedule,
} from "@/lib/schedule-save";
import { readShopState } from "@/lib/shop-storage";
import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "@/lib/forwarding-guides";
import {
  normalizeForwardingProvider,
} from "@/lib/forwarding-guides";
import { type ScheduleRow } from "@/lib/schedule-format";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";

const SECTION_SCROLL_IDS: Record<string, string> = {
  contact: "go-live-contact",
  schedule: "go-live-schedule",
  phone: "go-live-phone",
  jobber: "go-live-jobber",
  shop: "go-live-shop",
};

export function SettingsView({
  paid: paidProp,
  transactionId,
  section,
}: {
  paid?: boolean;
  transactionId?: string;
  section?: string;
}) {
  return (
    <SettingsSaveProvider>
      <SettingsViewBody paid={paidProp} transactionId={transactionId} section={section} />
    </SettingsSaveProvider>
  );
}

function SettingsViewBody({
  paid: paidProp,
  transactionId,
  section,
}: {
  paid?: boolean;
  transactionId?: string;
  section?: string;
}) {
  const settingsPage = useSettingsPage();
  const settingsTourSteps = useMemo(() => getSettingsTourSteps(), []);
  const router = useRouter();
  const saveAll = useSettingsSaveAll();
  const saveStep = useSettingsSaveStep();
  const [saveBarSaving, setSaveBarSaving] = useState(false);
  const [saveBarSaved, setSaveBarSaved] = useState(false);
  const [saveBarError, setSaveBarError] = useState<string | null>(null);

  const { shop, setShop, refresh } = useShopState();
  const [alwaysOn, setAlwaysOn] = useState(() =>
    isAlwaysOnFromWindows(
      readShopState().scheduleWindows,
      readShopState().scheduleAlwaysOn,
    ),
  );
  const [rows, setRows] = useState<ScheduleRow[]>(() =>
    parseRowsFromStored(readShopState().scheduleWindows),
  );
  const [confirmed, setConfirmed] = useState<string[]>(() =>
    readShopState().answerScheduleActive
      ? readShopState().scheduleWindows.map((w) => w.label)
      : [],
  );
  const [jobberConnected, setJobberConnected] = useState(
    () => readShopState().jobberConnected,
  );
  const [jobberAccount, setJobberAccount] = useState<string | null>(null);
  const [contactComplete, setContactComplete] = useState(false);
  const [contactValid, setContactValid] = useState(false);
  const [phoneProgress, setPhoneProgress] = useState<{
    quizDone: boolean;
    phoneNumber: string | null;
  }>({ quizDone: false, phoneNumber: null });
  const [forwardingPrefs, setForwardingPrefs] = useState<{
    scenario: ForwardingScenarioId;
    provider: ForwardingProviderId;
  }>({
    scenario: "overflow",
    provider: normalizeForwardingProvider(shop.forwardingProvider ?? "effiroad_main"),
  });

  const canConfirm = canSaveSchedule(rows, alwaysOn);

  const refreshContact = useCallback(async () => {
    try {
      const res = await fetch("/api/account/contact");
      const data = (await res.json()) as {
        contactComplete?: boolean;
        email?: string;
        phone?: string;
        phoneDisplay?: string;
      };
      if (res.ok) {
        setContactComplete(Boolean(data.contactComplete));
      }
    } catch {
      setContactComplete(false);
    }
  }, []);

  const refreshJobber = useCallback(async () => {
    try {
      const res = await fetch("/api/jobber/status");
      const data = (await res.json()) as {
        connected?: boolean;
        accountName?: string | null;
        accountEmail?: string | null;
      };
      const connected = Boolean(data.connected);
      setJobberConnected(connected);
      const label = data.accountName?.trim();
      const email = data.accountEmail?.trim();
      setJobberAccount(
        label && email ? `${label} (${email})` : label || email || null,
      );
      if (connected) {
        setShop((prev) => {
          if (prev.jobberConnected) return prev;
          return { ...prev, jobberConnected: true };
        });
      }
    } catch {
      setJobberConnected(false);
      setJobberAccount(null);
    }
  }, [setShop]);

  useEffect(() => {
    setAlwaysOn(isAlwaysOnFromWindows(shop.scheduleWindows, shop.scheduleAlwaysOn));
    setRows(parseRowsFromStored(shop.scheduleWindows));
    setConfirmed(
      shop.answerScheduleActive ? shop.scheduleWindows.map((w) => w.label) : [],
    );
  }, [shop]);

  useEffect(() => {
    void refreshJobber();
    void refreshContact();
  }, [refreshJobber, refreshContact]);

  const handleBeforeContinue = useCallback(
    async (stepId: string) => {
      const saverId =
        stepId === "go-live-contact"
          ? "contact"
          : stepId === "go-live-schedule"
            ? "schedule"
            : stepId === "go-live-phone"
              ? "forwarding"
              : null;
      if (!saverId) return true;
      setSaveBarError(null);
      const result = await saveStep(saverId);
      if (result.ok) {
        setSaveBarSaved(true);
        await refreshContact();
        return true;
      }
      setSaveBarError(settingsPage.saveAllError);
      return false;
    },
    [refreshContact, saveStep, settingsPage.saveAllError],
  );

  const handleWizardStepChange = useCallback(
    (stepId: string) => {
      const key = Object.entries(SECTION_SCROLL_IDS).find(([, v]) => v === stepId)?.[0];
      if (key) {
        router.replace(`${ROUTES.settings}?section=${key}`, { scroll: false });
      }
    },
    [router],
  );

  function handleRowsChange(next: ScheduleRow[]) {
    setRows(next);
    if (confirmed.length > 0) setConfirmed([]);
  }

  function handleAlwaysOnChange(next: boolean) {
    setAlwaysOn(next);
    setRows(next ? [alwaysOnScheduleRow()] : defaultScheduleRows());
    if (confirmed.length > 0) setConfirmed([]);
  }

  async function handleJobberConfirm() {
    if (!jobberConnected) return;
    const next = await markJobberConfirmed(shop);
    setShop(next);
    await refresh();
  }

  async function handleJobberSkip() {
    const next = await markJobberSkipped(shop);
    setShop(next);
    await refresh();
  }

  const persistSchedule = useCallback(async () => {
    if (!contactComplete || !canConfirm) return true;
    const next = await saveSchedule(shop, rows, true, alwaysOn);
    setShop(next);
    await refresh();
    setConfirmed(next.scheduleWindows.map((w) => w.label));
    return true;
  }, [alwaysOn, canConfirm, contactComplete, refresh, rows, setShop, shop]);

  const persistForwarding = useCallback(async () => {
    if (!contactComplete) return true;
    const next = await markForwardingDone(shop, forwardingPrefs);
    setShop(next);
    await refresh();
    return true;
  }, [contactComplete, forwardingPrefs, refresh, setShop, shop]);

  useSettingsSaveRegistration("schedule", persistSchedule);
  useSettingsSaveRegistration("forwarding", persistForwarding);

  async function handleSaveAll() {
    setSaveBarSaving(true);
    setSaveBarSaved(false);
    setSaveBarError(null);
    const result = await saveAll();
    setSaveBarSaving(false);
    if (result.ok) {
      setSaveBarSaved(true);
      await refreshContact();
    } else {
      setSaveBarError(settingsPage.saveAllError);
    }
  }

  const jobberLinked = jobberConnected;
  const jobberStepDone =
    shop.jobberSkipped === true ||
    (shop.jobberSetupConfirmed === true && jobberLinked);

  const items = getIntegrationItems(shop, { jobberConnected, contactComplete });
  const contactItem = items.find((i) => i.id === "contact")!;
  const scheduleItem = items.find((i) => i.id === "schedule")!;
  const phoneItem = items.find((i) => i.id === "phone")!;
  const jobberItem = items.find((i) => i.id === "jobber")!;

  const requiredTotal = countRequiredTotal(items);
  const requiredDone = countRequiredComplete(items);
  const live = isFullyLive(shop, { jobberConnected, contactComplete });
  const progressPct = Math.round((requiredDone / requiredTotal) * 100);

  const initialWizardStepId = section ? SECTION_SCROLL_IDS[section] : undefined;

  const wizardSteps: GoLiveWizardStep[] = useMemo(
    () => [
      {
        id: "go-live-contact",
        label: settingsPage.goLiveNavContact,
        stepLabel: settingsPage.stepPrefix(settingsPage.sectionSteps.contact),
        title: settingsPage.contactTitle,
        description: settingsPage.contactDescription,
        quickTip: settingsPage.contactQuickTip,
        icon: "📱",
        done: contactItem.done,
        canContinue: contactValid,
        continueHint: contactValid ? undefined : settingsPage.wizardContactRequired,
        content: (
          <OwnerContactSetup onSaved={setContactComplete} onValidChange={setContactValid} />
        ),
      },
      {
        id: "go-live-schedule",
        label: settingsPage.goLiveNavSchedule,
        stepLabel: settingsPage.stepPrefix(settingsPage.sectionSteps.schedule),
        title: settingsPage.scheduleTitle,
        description: settingsPage.scheduleDescription,
        quickTip: settingsPage.scheduleQuickTip,
        icon: "🕐",
        done: scheduleItem.done,
        canContinue: contactComplete && canConfirm,
        continueHint: !contactComplete
          ? settingsPage.contactRequiredFirst
          : !canConfirm
            ? settingsPage.wizardScheduleRequired
            : undefined,
        content: (
          <>
            {!contactComplete ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
                {settingsPage.contactRequiredFirst}
              </p>
            ) : null}
            <ScheduleEditor
              rows={rows}
              onChange={handleRowsChange}
              alwaysOn={alwaysOn}
              onAlwaysOnChange={handleAlwaysOnChange}
              compact
            />
          </>
        ),
      },
      {
        id: "go-live-phone",
        label: settingsPage.goLiveNavPhone,
        stepLabel: settingsPage.stepPrefix(settingsPage.sectionSteps.phone),
        title: settingsPage.phoneTitle,
        description: settingsPage.phoneDescription,
        quickTip: settingsPage.phoneQuickTip,
        icon: "📞",
        done: phoneItem.done,
        canContinue:
          contactComplete && phoneProgress.quizDone && Boolean(phoneProgress.phoneNumber),
        continueHint: !contactComplete
          ? settingsPage.contactRequiredFirst
          : !phoneProgress.quizDone
            ? settingsPage.wizardPhonePickPath
            : !phoneProgress.phoneNumber
              ? settingsPage.wizardPhoneRequired
              : undefined,
        content: (
          <>
            {!contactComplete ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
                {settingsPage.contactRequiredFirst}
              </p>
            ) : null}
            <ForwardingSetup
              confirmed={shop.forwardingDone}
              confirmDisabled={!contactComplete}
              initialScenario={shop.forwardingScenario ?? "overflow"}
              initialProvider={shop.forwardingProvider}
              onPreferencesChange={setForwardingPrefs}
              onProgressChange={setPhoneProgress}
              batchSave
              hideConfirmedBanner
              embeddedInGoLive
            />
          </>
        ),
      },
      {
        id: "go-live-jobber",
        label: settingsPage.goLiveNavJobber,
        stepLabel: settingsPage.stepPrefix(settingsPage.sectionSteps.jobber),
        title: settingsPage.jobberTitle,
        description: settingsPage.jobberDescription,
        quickTip: settingsPage.jobberQuickTip,
        icon: "🔗",
        optional: true,
        done: jobberItem.done,
        canContinue: true,
        content: (
          <JobberSettingsPanel
            connected={jobberConnected}
            stepDone={jobberStepDone}
            showConfirm={jobberLinked}
            onConfirm={() => void handleJobberConfirm()}
            onSkip={() => void handleJobberSkip()}
            onStatusChange={(connected, meta) => {
              setJobberConnected(connected);
              void refreshJobber();
              if (connected && meta?.freshConnect) {
                setShop((prev) => ({
                  ...prev,
                  jobberConnected: true,
                  jobberSetupConfirmed: false,
                }));
              } else if (!connected) {
                setJobberAccount(null);
                setShop((prev) => ({
                  ...prev,
                  jobberConnected: false,
                  jobberSetupConfirmed: false,
                }));
              }
            }}
          />
        ),
      },
      {
        id: "go-live-shop",
        label: settingsPage.goLiveNavShop,
        stepLabel: settingsPage.stepPrefix(settingsPage.sectionSteps.shop),
        title: settingsPage.productSectionTitle,
        description: settingsPage.productSectionSubtitle,
        icon: "⚙️",
        done: live,
        canContinue: true,
        content: (
          <ShopPreferencesPanel
            verticalSelector={
              <VerticalSelector
                vertical={shop.vertical ?? "restoration"}
                onSaved={(v) => setShop((prev) => ({ ...prev, vertical: v }))}
              />
            }
            reviewUrl={shop.googleReviewUrl}
            onReviewUrlSaved={(url) => setShop((prev) => ({ ...prev, googleReviewUrl: url }))}
          />
        ),
      },
    ],
    [
      alwaysOn,
      canConfirm,
      contactComplete,
      contactItem.done,
      contactValid,
      handleAlwaysOnChange,
      handleJobberConfirm,
      handleJobberSkip,
      handleRowsChange,
      jobberConnected,
      jobberItem.done,
      jobberLinked,
      jobberStepDone,
      live,
      phoneItem.done,
      phoneProgress.phoneNumber,
      phoneProgress.quizDone,
      refreshJobber,
      rows,
      scheduleItem.done,
      settingsPage,
      shop,
      shop.forwardingDone,
      shop.forwardingProvider,
      shop.forwardingScenario,
      setShop,
    ],
  );

  return (
    <div className="vow-settings-page-body space-y-3 sm:space-y-6">
      <SettingsUiVersion />

      <div
        data-tour-step="settings-save"
        className="vow-app-bleed-x sticky top-0 z-30 flex items-start justify-between gap-3 border-b border-brand-200/80 bg-[#f8f6f2]/95 py-2 backdrop-blur-md sm:rounded-2xl sm:border sm:bg-white sm:py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700 sm:text-xs">
            {settingsPage.badge}
          </p>
          <h1 className="text-lg font-bold text-brand-950 sm:text-2xl">{settingsPage.title}</h1>
          <p className="mt-0.5 hidden text-sm text-stone-600 sm:block">{settingsPage.subtitle}</p>
        </div>
        <SettingsSaveButton
          saving={saveBarSaving}
          saved={saveBarSaved}
          error={saveBarError}
          onSave={() => void handleSaveAll()}
        />
      </div>

      {paidProp || transactionId ? (
        <BillingStatusBanner transactionId={transactionId} />
      ) : null}

      <TestModeToggle />

      <section id="go-live" className="scroll-mt-6 space-y-3">
        <GoLiveWizard
          steps={wizardSteps}
          initialStepId={initialWizardStepId}
          onBeforeContinue={handleBeforeContinue}
          onStepChange={handleWizardStepChange}
        />

        <div id="go-live-progress" className="hidden lg:block">
          <GoLiveProgressCard
            requiredDone={requiredDone}
            requiredTotal={requiredTotal}
            progressPct={progressPct}
            live={live}
          />
        </div>

        {live ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900 lg:hidden">
            {settingsPage.allDone}
          </p>
        ) : null}
      </section>

      <button
        type="button"
        onClick={() => router.push(ROUTES.dashboard)}
        className="vow-dash-btn-primary hidden min-h-[48px] w-full px-4 py-3 text-base lg:block"
      >
        {settingsPage.backDashboard}
      </button>

      <p className="text-center text-sm text-slate-500">
        {settingsPage.support.replace("{email}", SITE.supportEmail)}
      </p>

      <GuidedTour
        steps={settingsTourSteps}
        storageKey="effiroad_settings_tour_v3"
        tourLabel="Setup guide"
        doneMap={{
          "go-live-contact": contactItem.done,
          "go-live-schedule": scheduleItem.done,
          "go-live-phone": phoneItem.done,
          "go-live-jobber": jobberItem.done,
        }}
      />
    </div>
  );
}

function VerticalSelector({
  vertical,
  onSaved,
}: {
  vertical: ShopVertical;
  onSaved: (v: ShopVertical) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<ShopVertical>(vertical);

  async function handleChange(v: ShopVertical) {
    setDraft(v);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/shop/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: v }),
      });
      if (res.ok) {
        onSaved(v);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-brand-900">Your trade</p>
      <p className="mb-3 text-xs text-slate-500">
        Sets intake questions and dispatch rules. Most restoration shops leave the default.
      </p>
      <div className="flex flex-wrap gap-2">
        {/* Always include the shop's current vertical even if it's not in the visible
            picker list (e.g. set before we narrowed the picker) so nothing disappears. */}
        {(VISIBLE_SHOP_VERTICALS.includes(draft)
          ? VISIBLE_SHOP_VERTICALS
          : [...VISIBLE_SHOP_VERTICALS, draft]
        ).map((v) => {
          const cfg = getVerticalConfig(v);
          const active = draft === v;
          return (
            <button
              key={v}
              type="button"
              disabled={saving}
              onClick={() => void handleChange(v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                active
                  ? "border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-200"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>
      {saving ? (
        <p className="mt-2 text-xs text-slate-500">Saving…</p>
      ) : saved ? (
        <p className="mt-2 text-xs text-emerald-600">Saved</p>
      ) : null}
    </div>
  );
}
