"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ALL_SHOP_VERTICALS, type ShopVertical } from "@/lib/shop-vertical";
import { getVerticalConfig } from "@/lib/vertical-config";
import { JobberSettingsPanel } from "@/components/settings/JobberSettingsPanel";
import { ForwardingSetup } from "@/components/settings/ForwardingSetup";
import { BillingStatusBanner } from "@/components/settings/BillingStatusBanner";
import { BookingSettingsEditor } from "@/components/settings/BookingSettingsEditor";
import { TechDispatchSettings } from "@/components/settings/TechDispatchSettings";
import { AgreementKeeperSettingsEditor } from "@/components/settings/AgreementKeeperSettings";
import { ShopNameEditor } from "@/components/settings/ShopNameEditor";
import { OwnerContactSetup } from "@/components/settings/OwnerContactSetup";
import { GoLiveStep } from "@/components/settings/GoLiveStep";
import { GoLiveStepNav } from "@/components/settings/GoLiveStepNav";
import { GoLiveProgressCard } from "@/components/settings/GoLiveProgressCard";
import {
  SettingsSaveProvider,
  useSettingsSaveAll,
  useSettingsSaveRegistration,
} from "@/components/settings/SettingsSaveContext";
import { SettingsSaveBar } from "@/components/settings/SettingsSaveBar";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
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
  FORWARDING_PROVIDERS,
  FORWARDING_SCENARIOS,
} from "@/lib/forwarding-guides";
import { SCHEDULE_ALWAYS_ON_LABEL, type ScheduleRow } from "@/lib/schedule-format";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";

export function SettingsView({
  paid: paidProp,
  sessionId,
}: {
  paid?: boolean;
  sessionId?: string;
}) {
  return (
    <SettingsSaveProvider>
      <SettingsViewBody paid={paidProp} sessionId={sessionId} />
    </SettingsSaveProvider>
  );
}

function SettingsViewBody({
  paid: paidProp,
  sessionId,
}: {
  paid?: boolean;
  sessionId?: string;
}) {
  const settingsPage = useSettingsPage();
  const router = useRouter();
  const saveAll = useSettingsSaveAll();
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
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [forwardingPrefs, setForwardingPrefs] = useState<{
    scenario: ForwardingScenarioId;
    provider: ForwardingProviderId;
  }>({
    scenario: shop.forwardingScenario ?? "overflow",
    provider: shop.forwardingProvider ?? "dialpad",
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
        setContactEmail(data.email ?? "");
        setContactPhone(data.phone ?? data.phoneDisplay ?? "");
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

  const stepStatus = {
    doneLabel: settingsPage.statusDone,
    pendingLabel: settingsPage.statusPending,
    optionalLabel: settingsPage.tabOptional,
    skippedLabel: settingsPage.tabSkipped,
    editLabel: settingsPage.editLabel,
    collapseLabel: settingsPage.collapseLabel,
  };

  const forwardingScenarioLabel =
    FORWARDING_SCENARIOS.find((s) => s.id === (shop.forwardingScenario ?? "overflow"))?.label ??
    "";
  const forwardingProviderLabel =
    FORWARDING_PROVIDERS.find((p) => p.id === (shop.forwardingProvider ?? "dialpad"))?.label ?? "";

  const scheduleSummary =
    alwaysOn || shop.scheduleAlwaysOn
      ? SCHEDULE_ALWAYS_ON_LABEL
      : confirmed.length > 0
        ? confirmed
        : shop.scheduleWindows.map((w) => w.label);

  return (
    <div className="vow-settings-page-body space-y-8">
      {paidProp || sessionId ? (
        <BillingStatusBanner sessionId={sessionId} />
      ) : null}

      <section
        id="product-settings"
        className="scroll-mt-6 rounded-2xl border border-brand-200/80 bg-white p-5 shadow-card sm:p-6"
      >
        <SettingsSectionHeader
          icon="⚙️"
          title={settingsPage.productSectionTitle}
          hint={settingsPage.productSectionSubtitle}
          className="mb-6 border-b border-brand-100 pb-5"
        />

        <div className="space-y-6">
          <div id="shop-name" className="scroll-mt-24">
            <ShopNameEditor />
          </div>
          <div id="shop-vertical" className="scroll-mt-24">
            <VerticalSelector
              vertical={shop.vertical ?? "restoration"}
              onSaved={(v) => setShop((prev) => ({ ...prev, vertical: v }))}
            />
          </div>
          <div id="booking-settings" className="scroll-mt-24">
            <BookingSettingsEditor />
          </div>
          <section id="tech-dispatch" className="scroll-mt-24">
            <TechDispatchSettings />
          </section>
          <AgreementKeeperSettingsEditor />
        </div>
      </section>

      <section id="go-live" className="scroll-mt-6 space-y-5">
        <SettingsSectionHeader
          icon="🚀"
          title={settingsPage.goLiveSectionTitle}
          hint={settingsPage.goLiveSectionSubtitle}
          className="rounded-2xl border border-brand-200/80 bg-white p-5 shadow-card sm:p-6"
        />

        <GoLiveProgressCard
          requiredDone={requiredDone}
          requiredTotal={requiredTotal}
          progressPct={progressPct}
          live={live}
        />

        <GoLiveStepNav
          items={[
            {
              id: "go-live-contact",
              step: settingsPage.sectionSteps.contact,
              label: settingsPage.goLiveNavContact,
              done: contactItem.done,
            },
            {
              id: "go-live-schedule",
              step: settingsPage.sectionSteps.schedule,
              label: settingsPage.goLiveNavSchedule,
              done: scheduleItem.done,
            },
            {
              id: "go-live-phone",
              step: settingsPage.sectionSteps.phone,
              label: settingsPage.goLiveNavPhone,
              done: phoneItem.done,
            },
            {
              id: "go-live-jobber",
              step: settingsPage.sectionSteps.jobber,
              label: settingsPage.goLiveNavJobber,
              done: jobberItem.done,
              optional: true,
            },
          ]}
        />

        <div className="space-y-5">
          <GoLiveStep
            id="go-live-contact"
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.contact)}
            title={settingsPage.contactTitle}
            description={settingsPage.contactDescription}
            quickTip={settingsPage.contactQuickTip}
            icon="📱"
            done={contactItem.done}
            doneSummary={
              <div className="space-y-1">
                <p>{settingsPage.contactConfirmed}</p>
                {contactEmail ? (
                  <p className="text-sm text-emerald-800/90">
                    {settingsPage.contactEmailLabel}: {contactEmail}
                  </p>
                ) : null}
                {contactPhone ? (
                  <p className="text-sm text-emerald-800/90">
                    {settingsPage.contactPhoneLabelKr}: {contactPhone}
                  </p>
                ) : null}
              </div>
            }
            {...stepStatus}
          >
            <OwnerContactSetup onSaved={setContactComplete} />
          </GoLiveStep>

          <GoLiveStep
            id="go-live-schedule"
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.schedule)}
            title={settingsPage.scheduleTitle}
            description={settingsPage.scheduleDescription}
            quickTip={settingsPage.scheduleQuickTip}
            icon="🕐"
            done={scheduleItem.done}
            doneSummary={
              Array.isArray(scheduleSummary) ? (
                <ul className="space-y-1">
                  {scheduleSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p>{scheduleSummary}</p>
              )
            }
            {...stepStatus}
          >
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
            {!canConfirm ? (
              <p className="mt-3 text-sm text-amber-800">{settingsPage.scheduleValidation}</p>
            ) : (
              <p className="mt-3 text-sm text-stone-600">{settingsPage.saveAllHint}</p>
            )}
          </GoLiveStep>

          <GoLiveStep
            id="go-live-phone"
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.phone)}
            title={settingsPage.phoneTitle}
            description={settingsPage.phoneDescription}
            quickTip={settingsPage.phoneQuickTip}
            icon="📞"
            done={phoneItem.done}
            doneSummary={
              <div className="space-y-1">
                <p>{settingsPage.phoneConfirmed}</p>
                <p className="text-sm text-emerald-800/90">
                  {forwardingScenarioLabel} · {forwardingProviderLabel}
                </p>
              </div>
            }
            {...stepStatus}
          >
            {!contactComplete ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
                {settingsPage.contactRequiredFirst}
              </p>
            ) : null}
            <ForwardingSetup
              confirmed={shop.forwardingDone}
              confirmDisabled={!contactComplete}
              initialScenario={shop.forwardingScenario ?? "overflow"}
              initialProvider={shop.forwardingProvider ?? "dialpad"}
              onPreferencesChange={setForwardingPrefs}
              batchSave
              hideConfirmedBanner
            />
          </GoLiveStep>

          <GoLiveStep
            id="go-live-jobber"
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.jobber)}
            title={settingsPage.jobberTitle}
            description={settingsPage.jobberDescription}
            quickTip={settingsPage.jobberQuickTip}
            icon="🔗"
            done={jobberItem.done}
            optional
            skipped={jobberItem.skipped}
            doneSummary={
              shop.jobberSkipped ? (
                <p>{settingsPage.jobberSkippedNote}</p>
              ) : jobberAccount ? (
                <p>
                  {settingsPage.jobberConnectedSummary.replace("{account}", jobberAccount)}
                </p>
              ) : (
                <p>{settingsPage.jobberConfirmed}</p>
              )
            }
            {...stepStatus}
          >
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
          </GoLiveStep>
        </div>
      </section>

      <SettingsSaveBar
        saving={saveBarSaving}
        saved={saveBarSaved}
        error={saveBarError}
        onSave={() => void handleSaveAll()}
      />

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
      <p className="mb-1.5 text-sm font-medium text-brand-900">Trade vertical</p>
      <p className="mb-3 text-xs text-slate-500">
        Sets your AI dispatch rules, intake questions, and landing page.
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_SHOP_VERTICALS.map((v) => {
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
