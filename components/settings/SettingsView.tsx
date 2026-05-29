"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { JobberConnect } from "@/components/dashboard/JobberConnect";
import { PhoneSetup } from "@/components/dashboard/PhoneSetup";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";
import { settingsPage } from "@/lib/content";
import { ROUTES, SITE } from "@/lib/constants";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  countComplete,
  getIntegrationItems,
  isFullyLive,
  type IntegrationSection,
} from "@/lib/integration-status";
import { parseRowsFromStored } from "@/lib/schedule-format";
import {
  canSaveSchedule,
  markForwardingDone,
  markJobberConfirmed,
  saveSchedule,
} from "@/lib/schedule-save";
import { readShopState } from "@/lib/shop-storage";
import type { ScheduleRow } from "@/lib/schedule-format";

const TABS: IntegrationSection[] = ["schedule", "jobber", "phone"];

const TAB_LABELS: Record<IntegrationSection, string> = {
  schedule: settingsPage.tocSchedule,
  jobber: settingsPage.tocJobber,
  phone: settingsPage.tocPhone,
};

function tabFromParam(value: string | null): IntegrationSection {
  if (value === "jobber" || value === "phone" || value === "schedule") return value;
  return "schedule";
}

export function SettingsView({ paid }: { paid?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const { shop, setShop, refresh } = useShopState();
  const [activeTab, setActiveTab] = useState<IntegrationSection>(() =>
    tabFromParam(sectionParam),
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

  const canConfirm = canSaveSchedule(rows);

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
    setActiveTab(tabFromParam(sectionParam));
  }, [sectionParam]);

  useEffect(() => {
    setRows(parseRowsFromStored(shop.scheduleWindows));
    setConfirmed(
      shop.answerScheduleActive
        ? shop.scheduleWindows.map((w) => w.label)
        : [],
    );
  }, [shop]);

  useEffect(() => {
    refreshJobber();
  }, [refreshJobber]);

  function switchTab(tab: IntegrationSection) {
    setActiveTab(tab);
    router.replace(`${ROUTES.settings}?section=${tab}`, { scroll: false });
  }

  function handleRowsChange(next: ScheduleRow[]) {
    setRows(next);
    if (confirmed.length > 0) setConfirmed([]);
  }

  function handleScheduleConfirm() {
    if (!canConfirm) return;
    const next = saveSchedule(shop, rows, true);
    setShop(next);
    refresh();
    setConfirmed(next.scheduleWindows.map((w) => w.label));
    switchTab("jobber");
  }

  function handleJobberConfirm() {
    if (!jobberConnected) return;
    const next = markJobberConfirmed(shop);
    setShop(next);
    refresh();
    switchTab("phone");
  }

  function handleForwardingConfirm() {
    const next = markForwardingDone(shop);
    setShop(next);
    refresh();
  }

  const jobberLinked = jobberConnected;
  const jobberStepDone = shop.jobberSetupConfirmed === true && jobberLinked;

  const items = getIntegrationItems(shop, { jobberConnected });
  const complete = countComplete(items);
  const live = isFullyLive(shop, jobberConnected);
  const progressPct = Math.round((complete / 3) * 100);

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
                .replace("{done}", String(complete))
                .replace("{total}", "3")}
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
        className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
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
                {item.done ? "완료" : "설정 필요"}
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
                {settingsPage.sectionSteps[activeTab]}단계
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {activeTab === "schedule"
                  ? settingsPage.scheduleTitle
                  : activeTab === "jobber"
                    ? settingsPage.jobberTitle
                    : settingsPage.phoneTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {activeTab === "schedule"
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
          {activeTab === "schedule" ? (
            <>
              <ScheduleEditor rows={rows} onChange={handleRowsChange} compact />

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
                disabled={!canConfirm}
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

              {jobberLinked ? (
                <button
                  type="button"
                  onClick={
                    jobberStepDone ? () => switchTab("phone") : handleJobberConfirm
                  }
                  className="hvac-btn-primary mt-4 w-full px-4 py-3 text-sm"
                >
                  {jobberStepDone ? settingsPage.nextPhone : settingsPage.jobberConfirm}
                </button>
              ) : null}
            </>
          ) : null}

          {activeTab === "phone" ? (
            <>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <PhoneSetup embedded />
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-relaxed text-slate-700">{settingsPage.phoneGuide}</p>
                <p className="mt-2 text-xs text-slate-500">{settingsPage.phoneSupport}</p>
              </div>
              {!shop.forwardingDone ? (
                <button
                  type="button"
                  onClick={handleForwardingConfirm}
                  className="hvac-btn-primary mt-4 w-full px-4 py-3 text-sm"
                >
                  {settingsPage.phoneConfirm}
                </button>
              ) : (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                  {settingsPage.phoneConfirmed}
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeTab !== "schedule" ? (
          <button
            type="button"
            onClick={() =>
              switchTab(activeTab === "phone" ? "jobber" : "schedule")
            }
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← 이전
          </button>
        ) : null}
        {activeTab !== "phone" ? (
          <button
            type="button"
            disabled={activeTab === "jobber" && jobberLinked && !jobberStepDone}
            onClick={() =>
              switchTab(activeTab === "schedule" ? "jobber" : "phone")
            }
            className="ml-auto rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            다음 →
          </button>
        ) : null}
      </div>

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
