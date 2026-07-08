"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VerticalPicker } from "@/components/onboarding/VerticalPicker";
import type { ShopVertical } from "@/lib/shop-vertical";
import { normalizeShopVertical } from "@/lib/shop-vertical";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";
import { ForwardingSetup } from "@/components/settings/ForwardingSetup";
import { onboardingPage, settingsPage } from "@/lib/content";
import { ROUTES, SITE } from "@/lib/constants";
import {
  alwaysOnScheduleRow,
  defaultScheduleRows,
  formatScheduleSentence,
  isAlwaysOnFromWindows,
  parseRowsFromStored,
  type ScheduleRow,
} from "@/lib/schedule-format";
import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "@/lib/forwarding-guides";
import { normalizeForwardingProvider } from "@/lib/forwarding-guides";
import { canSaveSchedule, markForwardingDone, saveSchedule } from "@/lib/schedule-save";
import type { ShopState } from "@/lib/types";
import { readShopState, writeShopState } from "@/lib/shop-storage";

export function OnboardingWizard({
  paid,
  focus,
}: {
  paid: boolean;
  focus?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [shop, setShop] = useState<ShopState>(() => readShopState());
  const [verticalDone, setVerticalDone] = useState<boolean>(
    () => readShopState().vertical != null,
  );
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
  const scheduleOnly = focus === "schedule";
  const canConfirm = canSaveSchedule(rows, alwaysOn);
  const [forwardingPrefs, setForwardingPrefs] = useState<{
    scenario: ForwardingScenarioId;
    provider: ForwardingProviderId;
  }>({
    scenario: "overflow",
    provider: normalizeForwardingProvider(shop.forwardingProvider),
  });

  function handleRowsChange(next: ScheduleRow[]) {
    setRows(next);
    if (scheduleOnly && confirmed.length > 0) {
      setConfirmed([]);
    }
  }

  function handleAlwaysOnChange(next: boolean) {
    setAlwaysOn(next);
    setRows(next ? [alwaysOnScheduleRow()] : defaultScheduleRows());
    if (confirmed.length > 0) setConfirmed([]);
  }

  const steps = onboardingPage.steps;
  const current = steps[step];

  async function handleConfirm() {
    if (!canConfirm) return;
    const next = await saveSchedule(shop, rows, true, alwaysOn);
    setShop(next);
    setConfirmed(next.scheduleWindows.map((w) => w.label));
  }

  async function completeStep() {
    if (current.id === "schedule") {
      if (!canConfirm) return;
      const next = await saveSchedule(shop, rows, true, alwaysOn);
      setShop(next);
      setStep(1);
      return;
    }
    if (current.id === "phone") {
      if (!shop.forwardingDone) return;
      setStep(2);
      return;
    }
    if (current.id === "jobber") {
      finishToDashboard();
    }
  }

  function skipJobber() {
    const next: ShopState = {
      ...readShopState(),
      jobberSkipped: true,
      onboardingComplete: true,
    };
    writeShopState(next);
    setShop(next);
    router.push(ROUTES.dashboard);
  }

  function finishToDashboard() {
    writeShopState({ ...readShopState(), onboardingComplete: true });
    router.push(ROUTES.dashboard);
  }

  if (!verticalDone) {
    return (
      <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6 shadow-card">
        <VerticalPicker
          onComplete={(v: ShopVertical) => {
            const next = { ...readShopState(), vertical: v };
            writeShopState(next);
            setShop(next);
            setVerticalDone(true);
          }}
        />
      </div>
    );
  }

  if (scheduleOnly) {
    return (
      <>
        <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6 shadow-card">
          <ScheduleEditor
            rows={rows}
            onChange={handleRowsChange}
            alwaysOn={alwaysOn}
            onAlwaysOnChange={handleAlwaysOnChange}
          />

          {!canConfirm ? (
            <p className="mt-3 text-xs text-amber-800">{settingsPage.scheduleValidation}</p>
          ) : null}

          {confirmed.length > 0 ? (
            <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {settingsPage.scheduleConfirmed}
              </p>
              <ul className="space-y-1 text-sm text-emerald-800">
                {confirmed.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {onboardingPage.scheduleSaveButton}
          </button>

          {confirmed.length > 0 ? (
            <button
              type="button"
              onClick={() => router.push(ROUTES.dashboard)}
              className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {onboardingPage.scheduleOnlyBack}
            </button>
          ) : null}
        </div>

        <p className="mt-6 text-center">
          <Link
            href={ROUTES.dashboard}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {onboardingPage.dashboardBackShort}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mt-8 space-y-4">
        {steps.map((s, index) => {
          const done = index < step;
          const active = index === step;
          const locked = index > step;

          return (
            <div
              key={s.id}
              className={`rounded-xl border p-6 shadow-card transition-all duration-300 ${
                active
                  ? "tour-step-active-card border-brand-300 bg-brand-50/50"
                  : done
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-surface-border bg-white opacity-60"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {onboardingPage.stepLabel(index + 1)}
                {done ? ` ${onboardingPage.stepDoneBadge}` : ""}
                {s.id === "jobber" ? ` ${onboardingPage.stepOptionalBadge}` : ""}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{s.description}</p>

              {active && s.id === "schedule" ? (
                <div className="mt-4 rounded-lg border border-surface-border bg-white p-3">
                  <ScheduleEditor
                    rows={rows}
                    onChange={handleRowsChange}
                    alwaysOn={alwaysOn}
                    onAlwaysOnChange={handleAlwaysOnChange}
                  />
                  {!canConfirm ? (
                    <p className="mt-2 text-xs text-amber-800">{settingsPage.scheduleValidation}</p>
                  ) : (
                    <ul className="mt-3 space-y-1 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
                      {alwaysOn
                        ? confirmed.length > 0
                          ? confirmed.map((line) => <li key={line}>{line}</li>)
                          : rows.map((row) => (
                              <li key={row.id}>{formatScheduleSentence(row)}</li>
                            ))
                        : rows
                            .filter((row) => row.days.length > 0)
                            .map((row) => (
                              <li key={row.id}>{formatScheduleSentence(row)}</li>
                            ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {active && s.id === "phone" ? (
                <div className="mt-4">
                  <ForwardingSetup
                    confirmed={shop.forwardingDone}
                    initialScenario={shop.forwardingScenario ?? "overflow"}
                    initialProvider={shop.forwardingProvider ?? "dialpad"}
                    onPreferencesChange={setForwardingPrefs}
                    onConfirm={() => {
                      void (async () => {
                        const next = await markForwardingDone(
                          readShopState(),
                          forwardingPrefs,
                        );
                        setShop(next);
                      })();
                    }}
                  />
                </div>
              ) : null}

              {active && s.id === "jobber" && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500">{onboardingPage.jobberHint}</p>
                  <a
                    href="/api/jobber/connect"
                    className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 tour-pulse-btn"
                  >
                    {onboardingPage.connectJobberButton}
                  </a>
                  <button
                    type="button"
                    onClick={skipJobber}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {onboardingPage.jobberSkip}
                  </button>
                </div>
              )}

              {!(active && s.id === "phone") ? (
                <button
                  type="button"
                  disabled={locked || (active && s.id === "schedule" && !canConfirm)}
                  onClick={active ? completeStep : undefined}
                  className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    locked || (active && s.id === "schedule" && !canConfirm)
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : done
                        ? "bg-emerald-600 text-white"
                        : `bg-slate-900 text-white hover:bg-slate-800 ${active ? "tour-pulse-btn" : ""}`
                  }`}
                >
                  {locked
                    ? onboardingPage.stepLockedLabel
                    : done
                      ? onboardingPage.stepDoneButton
                      : s.id === "schedule"
                        ? onboardingPage.scheduleSaveButton
                        : s.action}
                </button>
              ) : shop.forwardingDone ? (
                <button
                  type="button"
                  onClick={completeStep}
                  className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 tour-pulse-btn"
                >
                  {onboardingPage.forwardingNext}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {step >= steps.length - 1 && shop.forwardingDone && (
        <button
          type="button"
          onClick={finishToDashboard}
          className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 tour-pulse-btn"
        >
          {onboardingPage.completeAction}
        </button>
      )}

      {paid && step < 2 && (
        <button
          type="button"
          onClick={finishToDashboard}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          {onboardingPage.skipToDashboard}
        </button>
      )}

      <p className="mt-6 rounded-lg border border-surface-border bg-white px-4 py-3 text-center text-sm text-slate-600">
        {onboardingPage.liveBanner}
      </p>

      <p className="mt-6 text-center text-sm text-slate-500">{onboardingPage.support}</p>

      <p className="mt-8 text-center">
        <Link
          href={ROUTES.home}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          {onboardingPage.backHome}
        </Link>
      </p>
    </>
  );
}
