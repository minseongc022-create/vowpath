"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VISIBLE_SHOP_VERTICALS, type ShopVertical } from "@/lib/shop-vertical";
import { getVerticalConfig } from "@/lib/vertical-config";
import { JobberSettingsPanel } from "@/components/settings/JobberSettingsPanel";
import { ForwardingSetup } from "@/components/settings/ForwardingSetup";
import { BillingStatusBanner } from "@/components/settings/BillingStatusBanner";
import { BookingSettingsEditor } from "@/components/settings/BookingSettingsEditor";
import { TechDispatchSettings } from "@/components/settings/TechDispatchSettings";
import { AgreementKeeperSettingsEditor } from "@/components/settings/AgreementKeeperSettings";
import { SmsComplianceGuide } from "@/components/settings/SmsComplianceGuide";
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
  FORWARDING_PROVIDERS,
  FORWARDING_SCENARIOS,
  normalizeForwardingProvider,
} from "@/lib/forwarding-guides";
import { SCHEDULE_ALWAYS_ON_LABEL, type ScheduleRow } from "@/lib/schedule-format";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";
import { SettingsIntegrationsHub } from "@/components/settings/SettingsIntegrationsHub";

const SECTION_SCROLL_IDS: Record<string, string> = {
  contact: "go-live-contact",
  schedule: "go-live-schedule",
  phone: "go-live-phone",
  jobber: "go-live-jobber",
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

  useEffect(() => {
    if (!section) return;
    const targetId = SECTION_SCROLL_IDS[section] ?? section;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [section]);

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
    FORWARDING_PROVIDERS.find((p) => p.id === normalizeForwardingProvider(shop.forwardingProvider))?.label ?? "";

  const scheduleSummary =
    alwaysOn || shop.scheduleAlwaysOn
      ? SCHEDULE_ALWAYS_ON_LABEL
      : confirmed.length > 0
        ? confirmed
        : shop.scheduleWindows.map((w) => w.label);

  return (
    <div className="vow-settings-page-body space-y-5 sm:space-y-8">
      {paidProp || transactionId ? (
        <BillingStatusBanner transactionId={transactionId} />
      ) : null}

      <section id="go-live" className="scroll-mt-6 space-y-5">
        <SettingsSectionHeader
          icon="🚀"
          title={settingsPage.goLiveSectionTitle}
          hint={settingsPage.goLiveSectionSubtitle}
          className="rounded-2xl border border-brand-200/80 bg-white p-5 shadow-card sm:p-6"
        />

        <div id="go-live-progress" className="scroll-mt-24">
          <GoLiveProgressCard
            requiredDone={requiredDone}
            requiredTotal={requiredTotal}
            progressPct={progressPct}
            live={live}
          />
        </div>

        <SettingsIntegrationsHub
          phoneDone={phoneItem.done}
          jobberDone={jobberItem.done}
          jobberOptional
          zapierUrl={shop.zapierWebhookUrl}
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
            streamlineMobile
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

      <section
        id="product-settings"
        className="scroll-mt-6 rounded-2xl border border-brand-200/80 bg-white p-5 shadow-card sm:p-6"
      >
        <SettingsSectionHeader
          icon="⚙️"
          title="Shop preferences"
          hint="Booking rules, crew dispatch, and optional extras. Go-live steps above come first."
          className="mb-6 border-b border-brand-100 pb-5"
        />

        <div className="space-y-8">
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
          <SmsComplianceGuide />

          <div id="integrations-zapier" className="scroll-mt-24 rounded-xl border border-brand-100 bg-brand-50/20 p-4 sm:p-5">
            <ZapierWebhookEditor
              webhookUrl={shop.zapierWebhookUrl}
              onSaved={(url) => setShop((prev) => ({ ...prev, zapierWebhookUrl: url }))}
            />
          </div>

          <div id="integrations-widget" className="scroll-mt-24 rounded-xl border border-brand-100 bg-brand-50/20 p-4 sm:p-5">
            <WidgetEmbedCard />
          </div>

          <div className="scroll-mt-24">
            <GoogleReviewUrlEditor
              reviewUrl={shop.googleReviewUrl}
              onSaved={(url) => setShop((prev) => ({ ...prev, googleReviewUrl: url }))}
            />
          </div>
        </div>
      </section>

      <div data-tour-step="settings-save" className="scroll-mt-24">
        <SettingsSaveBar
          saving={saveBarSaving}
          saved={saveBarSaved}
          error={saveBarError}
          onSave={() => void handleSaveAll()}
        />
      </div>

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
      <p className="mb-1.5 text-sm font-medium text-brand-900">Trade vertical</p>
      <p className="mb-3 text-xs text-slate-500">
        Sets your AI dispatch rules, intake questions, and landing page.
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

function GoogleReviewUrlEditor({
  reviewUrl,
  onSaved,
}: {
  reviewUrl?: string;
  onSaved: (url: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(reviewUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && !/^https:\/\/.+/.test(trimmed)) {
      setError("Enter a valid https:// link.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/shop/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleReviewUrl: trimmed }),
      });
      if (res.ok) {
        onSaved(trimmed || undefined);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-brand-900">Google review link</p>
      <p className="mb-3 text-xs text-slate-500">
        After a job is marked complete, customers get an SMS with this link. Leave blank to skip review requests.
      </p>
      <input
        type="url"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={() => void handleSave()}
        placeholder="https://g.page/r/..."
        maxLength={300}
        className="vow-settings-input"
      />
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
      {saving ? (
        <p className="mt-2 text-xs text-slate-500">Saving…</p>
      ) : saved ? (
        <p className="mt-2 text-xs text-emerald-600">Saved</p>
      ) : null}
    </div>
  );
}

function ZapierWebhookEditor({
  webhookUrl,
  onSaved,
}: {
  webhookUrl?: string;
  onSaved: (url: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(webhookUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && !/^https:\/\/hooks\.zapier\.com\/.+/.test(trimmed)) {
      setError("Paste your Zapier Catch Hook URL (https://hooks.zapier.com/…).");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/shop/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zapierWebhookUrl: trimmed }),
      });
      if (res.ok) {
        onSaved(trimmed || undefined);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-brand-900">Zapier webhook</p>
      <p className="mb-3 text-xs text-slate-500">
        In Zapier: create <strong>Webhooks by Zapier → Catch Hook</strong>, paste the URL here. New requests
        will flow to ServiceTitan, Housecall Pro, Slack, or any tool you connect in Zapier.
      </p>
      <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-stone-600">
        <li>Zapier.com → Create Zap → Trigger: Catch Hook</li>
        <li>Copy the hook URL → paste below → Save</li>
        <li>Add your CRM/spreadsheet as the Zap action</li>
      </ol>
      <input
        type="url"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={() => void handleSave()}
        placeholder="https://hooks.zapier.com/hooks/catch/..."
        maxLength={300}
        className="vow-settings-input"
      />
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
      {saving ? (
        <p className="mt-2 text-xs text-slate-500">Saving…</p>
      ) : saved ? (
        <p className="mt-2 text-xs text-emerald-600">Saved</p>
      ) : null}
    </div>
  );
}

function WidgetEmbedCard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { userId?: string } | null) => {
        if (!cancelled && d?.userId) setUserId(d.userId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userId) return null;

  const widgetUrl = `${window.location.origin}/widget/${userId}`;
  const embedCode = `<iframe src="${widgetUrl}" style="position:fixed;bottom:20px;right:20px;width:360px;height:520px;border:none;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.2);z-index:9999;" title="Chat"></iframe>`;

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-brand-900">Website chat widget</p>
      <p className="mb-3 text-xs text-slate-500">
        Same AI intake as your phone line — embed on your homepage. Copy the code below into your site HTML.
      </p>
      <textarea
        readOnly
        value={embedCode}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="vow-settings-input font-mono text-xs"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(embedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-50"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
        <a
          href={widgetUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-50"
        >
          Preview
        </a>
      </div>
    </div>
  );
}
