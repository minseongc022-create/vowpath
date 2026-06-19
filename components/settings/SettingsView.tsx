"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { JobberConnect } from "@/components/dashboard/JobberConnect";
import { ForwardingSetup } from "@/components/settings/ForwardingSetup";
import { BillingStatusBanner } from "@/components/settings/BillingStatusBanner";
import { BookingSettingsEditor } from "@/components/settings/BookingSettingsEditor";
import { TechDispatchSettings } from "@/components/settings/TechDispatchSettings";
import { AgreementKeeperSettingsEditor } from "@/components/settings/AgreementKeeperSettings";
import { ShopNameEditor } from "@/components/settings/ShopNameEditor";
import { OwnerContactSetup } from "@/components/settings/OwnerContactSetup";
import { GoLiveStep } from "@/components/settings/GoLiveStep";
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
import type { ScheduleRow } from "@/lib/schedule-format";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";

export function SettingsView({
  paid: paidProp,
  sessionId,
}: {
  paid?: boolean;
  sessionId?: string;
}) {
  const settingsPage = useSettingsPage();
  const router = useRouter();

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
      const data = (await res.json()) as { contactComplete?: boolean };
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
      };
      const connected = Boolean(data.connected);
      setJobberConnected(connected);
      setJobberAccount(data.accountName ?? null);
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

  async function handleScheduleConfirm() {
    if (!canConfirm || !contactComplete) return;
    const next = await saveSchedule(shop, rows, true, alwaysOn);
    setShop(next);
    await refresh();
    setConfirmed(next.scheduleWindows.map((w) => w.label));
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

  async function handleForwardingConfirm() {
    const next = await markForwardingDone(shop, forwardingPrefs);
    setShop(next);
    await refresh();
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
  };

  return (
    <div className="space-y-8">
      {paidProp || sessionId ? (
        <BillingStatusBanner sessionId={sessionId} />
      ) : null}

      <section
        id="product-settings"
        className="scroll-mt-6 rounded-2xl border border-brand-300/50 bg-gradient-to-br from-brand-50/90 to-white p-5 shadow-card sm:p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            {settingsPage.productSectionTitle}
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            {settingsPage.productSectionSubtitle}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div id="shop-name" className="scroll-mt-24">
            <ShopNameEditor />
          </div>
          <div id="booking-settings" className="scroll-mt-24">
            <BookingSettingsEditor />
          </div>
          <section
            id="tech-dispatch"
            className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {settingsPage.techDispatchTitle}
            </p>
            <p className="mt-1 text-sm text-slate-600">{settingsPage.techDispatchSummary}</p>
            <div className="mt-4">
              <TechDispatchSettings />
            </div>
          </section>
          <AgreementKeeperSettingsEditor />
        </div>
      </section>

      <section id="go-live" className="scroll-mt-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {settingsPage.goLiveSectionTitle}
          </p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {settingsPage.goLiveSectionSubtitle}
          </p>
        </div>

        <div
          className={`rounded-2xl border px-5 py-4 sm:px-6 ${
            live
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
              : "border-brand-200 bg-gradient-to-br from-brand-50/60 to-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {settingsPage.progressTitle
                  .replace("{done}", String(requiredDone))
                  .replace("{total}", String(requiredTotal))}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                {live ? settingsPage.allDone : settingsPage.progressHint}
              </p>
            </div>
            <span className="text-2xl font-bold tabular-nums text-brand-700">
              {progressPct}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                live ? "bg-emerald-500" : "bg-brand-500"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <GoLiveStep
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.contact)}
            title={settingsPage.contactTitle}
            description={settingsPage.contactDescription}
            done={contactItem.done}
            {...stepStatus}
          >
            <OwnerContactSetup onSaved={setContactComplete} />
          </GoLiveStep>

          <GoLiveStep
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.schedule)}
            title={settingsPage.scheduleTitle}
            description={settingsPage.scheduleDescription}
            done={scheduleItem.done}
            {...stepStatus}
          >
            {!contactComplete ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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
              <p className="mt-3 text-xs text-amber-800">{settingsPage.scheduleValidation}</p>
            ) : null}
            {confirmed.length > 0 ? (
              <p className="mt-3 text-sm font-medium text-emerald-800">
                {settingsPage.scheduleConfirmed}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canConfirm || !contactComplete}
              onClick={handleScheduleConfirm}
              className="hvac-btn-primary mt-4 w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {settingsPage.scheduleConfirm}
            </button>
          </GoLiveStep>

          <GoLiveStep
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.phone)}
            title={settingsPage.phoneTitle}
            description={settingsPage.phoneDescription}
            done={phoneItem.done}
            {...stepStatus}
          >
            {!contactComplete ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {settingsPage.contactRequiredFirst}
              </p>
            ) : null}
            <ForwardingSetup
              confirmed={shop.forwardingDone}
              confirmDisabled={!contactComplete}
              initialScenario={shop.forwardingScenario ?? "overflow"}
              initialProvider={shop.forwardingProvider ?? "dialpad"}
              onPreferencesChange={setForwardingPrefs}
              onConfirm={handleForwardingConfirm}
            />
          </GoLiveStep>

          <GoLiveStep
            step={settingsPage.stepPrefix(settingsPage.sectionSteps.jobber)}
            title={settingsPage.jobberTitle}
            description={settingsPage.jobberDescription}
            done={jobberItem.done}
            optional
            skipped={jobberItem.skipped}
            {...stepStatus}
          >
            <p className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-950">
              {settingsPage.jobberScheduleAutoNote}
            </p>
            <JobberConnect
              embedded
              onStatusChange={(connected, meta) => {
                setJobberConnected(connected);
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
            {jobberAccount ? (
              <p className="mt-3 text-sm text-emerald-800">
                {settingsPage.jobberConnectedSummary.replace("{account}", jobberAccount)}
              </p>
            ) : null}
            {jobberStepDone ? (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                {shop.jobberSkipped
                  ? settingsPage.jobberSkippedNote
                  : settingsPage.jobberConfirmed}
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {jobberLinked ? (
                  <button
                    type="button"
                    onClick={handleJobberConfirm}
                    className="hvac-btn-primary flex-1 px-4 py-3 text-sm"
                  >
                    {settingsPage.jobberConfirm}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleJobberSkip}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {settingsPage.jobberSkip}
                </button>
              </div>
            )}
          </GoLiveStep>
        </div>
      </section>

      <button
        type="button"
        onClick={() => router.push(ROUTES.dashboard)}
        className="hvac-btn-primary w-full px-4 py-3 text-sm"
      >
        {settingsPage.backDashboard}
      </button>

      <p className="text-center text-sm text-slate-500">
        {settingsPage.support.replace("{email}", SITE.supportEmail)}
      </p>
    </div>
  );
}
