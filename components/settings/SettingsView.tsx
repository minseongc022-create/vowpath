"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { JobberConnect } from "@/components/dashboard/JobberConnect";
import { PhoneSetup } from "@/components/dashboard/PhoneSetup";
import { ForwardingSetup } from "@/components/settings/ForwardingSetup";
import { AuditActivityPanel } from "@/components/settings/AuditActivityPanel";
import { OpsFailuresPanel } from "@/components/settings/OpsFailuresPanel";
import { BookingSettingsEditor } from "@/components/settings/BookingSettingsEditor";
import { OwnerContactSetup } from "@/components/settings/OwnerContactSetup";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";
import { settingsPage } from "@/lib/content";
import { ROUTES, SITE } from "@/lib/constants";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  countRequiredComplete,
  countRequiredTotal,
  getIntegrationItems,
  isFullyLive,
  type IntegrationSection,
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

const TABS: IntegrationSection[] = ["contact", "schedule", "phone", "jobber"];

const TAB_LABELS: Record<IntegrationSection, string> = {
  contact: settingsPage.tocContact,
  schedule: settingsPage.tocSchedule,
  phone: settingsPage.tocPhone,
  jobber: settingsPage.tocJobber,
};

function tabFromParam(value: string | null): IntegrationSection {
  if (
    value === "contact" ||
    value === "jobber" ||
    value === "phone" ||
    value === "schedule"
  ) {
    return value;
  }
  return "contact";
}

export function SettingsView({ paid }: { paid?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const { shop, setShop, refresh } = useShopState();
  const activeTab = tabFromParam(sectionParam);
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
          const next = { ...prev, jobberConnected: true };
          return next;
        });
      }
    } catch {
      setJobberConnected(false);
      setJobberAccount(null);
    }
  }, [setShop]);

  useEffect(() => {
    const nextAlwaysOn = isAlwaysOnFromWindows(
      shop.scheduleWindows,
      shop.scheduleAlwaysOn,
    );
    setAlwaysOn(nextAlwaysOn);
    setRows(parseRowsFromStored(shop.scheduleWindows));
    setConfirmed(
      shop.answerScheduleActive
        ? shop.scheduleWindows.map((w) => w.label)
        : [],
    );
  }, [shop]);

  useEffect(() => {
    refreshJobber();
    refreshContact();
  }, [refreshJobber, refreshContact]);

  function switchTab(tab: IntegrationSection) {
    if (tab === activeTab) return;
    router.replace(`${ROUTES.settings}?section=${tab}`, { scroll: false });
  }

  function handleRowsChange(next: ScheduleRow[]) {
    setRows(next);
    if (confirmed.length > 0) setConfirmed([]);
  }

  function handleAlwaysOnChange(next: boolean) {
    setAlwaysOn(next);
    setRows(next ? [alwaysOnScheduleRow()] : defaultScheduleRows());
    if (confirmed.length > 0) setConfirmed([]);
  }

  function handleScheduleConfirm() {
    if (!contactComplete) {
      switchTab("contact");
      return;
    }
    if (!canConfirm) return;
    const next = saveSchedule(shop, rows, true, alwaysOn);
    setShop(next);
    refresh();
    setConfirmed(next.scheduleWindows.map((w) => w.label));
    switchTab("phone");
  }

  function handleJobberConfirm() {
    if (!jobberConnected) return;
    const next = markJobberConfirmed(shop);
    setShop(next);
    refresh();
  }

  function handleJobberSkip() {
    const next = markJobberSkipped(shop);
    setShop(next);
    refresh();
  }

  function handleForwardingConfirm() {
    const next = markForwardingDone(shop, forwardingPrefs);
    setShop(next);
    refresh();
  }

  const jobberLinked = jobberConnected;
  const jobberStepDone =
    shop.jobberSkipped === true ||
    (shop.jobberSetupConfirmed === true && jobberLinked);

  const items = getIntegrationItems(shop, { jobberConnected, contactComplete });
  const requiredTotal = countRequiredTotal(items);
  const requiredDone = countRequiredComplete(items);
  const live = isFullyLive(shop, { jobberConnected, contactComplete });
  const progressPct = Math.round((requiredDone / requiredTotal) * 100);

  const scheduleItem = items.find((item) => item.id === "schedule")!;
  const jobberItem = items.find((item) => item.id === "jobber")!;
  const phoneItem = items.find((item) => item.id === "phone")!;

  const activeItem = items.find((item) => item.id === activeTab)!;

  return (
    <div className="space-y-5">
      {paid ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {settingsPage.paidWelcome}
        </div>
      ) : null}

      <div
        className={`rounded-2xl border px-5 py-5 sm:px-6 ${
          live
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
            : "border-brand-200 bg-gradient-to-br from-brand-50/60 to-white"
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {settingsPage.progressTitle
                .replace("{done}", String(requiredDone))
                .replace("{total}", String(requiredTotal))}
            </p>
            {live ? (
              <p className="mt-1 text-sm text-emerald-800">{settingsPage.allDone}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">{settingsPage.progressHint}</p>
            )}
          </div>
          <span className="text-2xl font-bold tabular-nums text-brand-700">{progressPct}%</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              live ? "bg-emerald-500" : "bg-brand-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4"
        role="tablist"
        aria-label={settingsPage.tocLabel}
      >
        {TABS.map((tab) => {
          const item = items.find((i) => i.id === tab)!;
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => switchTab(tab)}
              className={`rounded-xl px-2 py-3 text-center text-xs font-semibold transition sm:text-sm ${
                selected
                  ? "bg-brand-600 text-white shadow-sm"
                  : item.done
                    ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="block">{TAB_LABELS[tab]}</span>
              <span className="mt-1 block text-[10px] font-normal opacity-80">
                {item.done
                  ? settingsPage.tabDone
                  : item.skipped
                    ? settingsPage.tabSkipped
                    : item.optional
                      ? settingsPage.tabOptional
                      : settingsPage.statusPending}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`overflow-hidden rounded-2xl border bg-white shadow-card ${
          activeItem.done ? "border-emerald-200" : "border-slate-200"
        }`}
        role="tabpanel"
      >
        <div
          className={`border-b px-5 py-4 sm:px-6 ${
            activeItem.done
              ? "border-emerald-100 bg-emerald-50/50"
              : "border-slate-100 bg-slate-50/80"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {settingsPage.stepPrefix(settingsPage.sectionSteps[activeTab])}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {activeTab === "contact"
                  ? settingsPage.contactTitle
                  : activeTab === "schedule"
                    ? settingsPage.scheduleTitle
                    : activeTab === "jobber"
                      ? settingsPage.jobberTitle
                      : settingsPage.phoneTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {activeTab === "contact"
                  ? settingsPage.contactDescription
                  : activeTab === "schedule"
                    ? settingsPage.scheduleDescription
                    : activeTab === "jobber"
                      ? settingsPage.jobberDescription
                      : settingsPage.phoneDescription}
              </p>
              {activeItem.done ? (
                <p className="mt-2 text-sm font-medium text-emerald-800">{activeItem.summary}</p>
              ) : null}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeItem.done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {activeItem.done ? settingsPage.statusDone : settingsPage.statusPending}
            </span>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {activeTab === "contact" ? (
            <OwnerContactSetup onSaved={setContactComplete} />
          ) : null}

          {activeTab === "schedule" ? (
            <>
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
                <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    {settingsPage.scheduleConfirmed}
                  </p>
                  <ul className="space-y-1.5 text-sm text-emerald-900">
                    {confirmed.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                disabled={!canConfirm || !contactComplete}
                onClick={handleScheduleConfirm}
                className="hvac-btn-primary mt-4 w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {settingsPage.scheduleConfirm}
              </button>
            </>
          ) : null}

          {activeTab === "jobber" ? (
            <>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
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
              </div>

              {jobberLinked && !jobberStepDone ? (
                <p className="mt-3 text-xs text-slate-600">{settingsPage.jobberConfirmHint}</p>
              ) : null}

              {jobberStepDone ? (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                  {settingsPage.jobberConfirmed}
                  {jobberAccount
                    ? ` (${settingsPage.jobberConnectedSummary.replace("{account}", jobberAccount)})`
                    : ""}
                </p>
              ) : null}

              {jobberLinked && !jobberStepDone ? (
                <button
                  type="button"
                  onClick={handleJobberConfirm}
                  className="hvac-btn-primary mt-4 w-full px-4 py-3 text-sm"
                >
                  {settingsPage.jobberConfirm}
                </button>
              ) : null}

              {!jobberStepDone ? (
                <button
                  type="button"
                  onClick={handleJobberSkip}
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {settingsPage.jobberSkip}
                </button>
              ) : null}

              {shop.jobberSkipped && !jobberLinked ? (
                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {settingsPage.jobberSkippedNote}
                </p>
              ) : null}
            </>
          ) : null}

          {activeTab === "phone" ? (
            <>
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
              <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                  {settingsPage.forwardingDevTitle}
                </summary>
                <div className="border-t border-slate-200 px-4 py-4">
                  <p className="mb-3 text-xs text-slate-500">{settingsPage.forwardingDevHint}</p>
                  <PhoneSetup embedded />
                </div>
              </details>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeTab !== "contact" ? (
          <button
            type="button"
            onClick={() => {
              if (activeTab === "schedule") switchTab("contact");
              else if (activeTab === "phone") switchTab("schedule");
              else switchTab("phone");
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {settingsPage.prevButton}
          </button>
        ) : null}
        {activeTab !== "jobber" ? (
          <button
            type="button"
            onClick={() => {
              if (activeTab === "contact") switchTab("schedule");
              else if (activeTab === "schedule") switchTab("phone");
              else switchTab("jobber");
            }}
            className="ml-auto rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            {activeTab === "contact"
              ? settingsPage.tocSchedule
              : activeTab === "schedule"
                ? settingsPage.nextPhone
                : settingsPage.nextJobber}{" "}
            →
          </button>
        ) : null}
      </div>

      <BookingSettingsEditor />

      <div className="rounded-2xl border border-slate-200 border-l-4 border-l-brand-500 bg-white p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {settingsPage.ownerAlertsTitle}
        </p>
        <p className="mt-2 text-sm text-slate-600">{settingsPage.ownerAlertsDescription}</p>
      </div>

      <AuditActivityPanel />
      <OpsFailuresPanel />

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

      <p className="text-center">
        <Link href={ROUTES.home} className="text-sm font-medium text-brand-600 hover:underline">
          {settingsPage.backHome}
        </Link>
      </p>
    </div>
  );
}
