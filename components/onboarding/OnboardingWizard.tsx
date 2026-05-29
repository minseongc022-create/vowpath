"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScheduleEditor } from "@/components/onboarding/ScheduleEditor";
import { onboardingPage } from "@/lib/content";
import { ROUTES, SITE } from "@/lib/constants";
import {
  formatScheduleSentence,
  parseRowsFromStored,
  rowToWindow,
  type ScheduleRow,
} from "@/lib/schedule-format";
import type { ShopState } from "@/lib/types";
import { readShopState, writeShopState } from "@/lib/shop-storage";

function canSaveSchedule(rows: ScheduleRow[]) {
  return rows.some((row) => row.days.length > 0);
}

function saveSchedule(shop: ShopState, rows: ScheduleRow[], activateAi: boolean) {
  const scheduleWindows = rows.map((row) => rowToWindow(row));
  const next: ShopState = {
    ...shop,
    scheduleWindows,
    answerScheduleActive: activateAi,
  };
  writeShopState(next);
  return next;
}

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
  const [rows, setRows] = useState<ScheduleRow[]>(() =>
    parseRowsFromStored(readShopState().scheduleWindows),
  );
  const [confirmed, setConfirmed] = useState<string[]>(() =>
    readShopState().answerScheduleActive
      ? readShopState().scheduleWindows.map((w) => w.label)
      : [],
  );
  const scheduleOnly = focus === "schedule";
  const canConfirm = canSaveSchedule(rows);

  function handleRowsChange(next: ScheduleRow[]) {
    setRows(next);
    if (scheduleOnly && confirmed.length > 0) {
      setConfirmed([]);
    }
  }

  const steps = onboardingPage.steps;
  const current = steps[step];

  function handleConfirm() {
    if (!canConfirm) return;
    const next = saveSchedule(shop, rows, true);
    setShop(next);
    setConfirmed(next.scheduleWindows.map((w) => w.label));
  }

  function completeStep() {
    if (current.id === "schedule") {
      if (!canConfirm) return;
      saveSchedule(shop, rows, true);
      setStep(1);
      return;
    }
    if (current.id === "jobber") {
      setStep(2);
      return;
    }
    if (current.id === "phone") {
      const next = {
        ...shop,
        forwardingDone: true,
        onboardingComplete: true,
      };
      writeShopState(next);
      router.push(ROUTES.dashboard);
    }
  }

  function finishToDashboard() {
    writeShopState({ ...shop, onboardingComplete: true });
    router.push(ROUTES.dashboard);
  }

  if (scheduleOnly) {
    return (
      <>
        <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6 shadow-card">
          <ScheduleEditor rows={rows} onChange={handleRowsChange} />

          {!canConfirm ? (
            <p className="mt-3 text-xs text-amber-800">
              최소 1개 시간대에서 요일을 선택해 주세요.
            </p>
          ) : null}

          {confirmed.length > 0 ? (
            <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                AI 수신 시간대가 연결되었습니다
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
            확인
          </button>

          {confirmed.length > 0 ? (
            <button
              type="button"
              onClick={() => router.push(ROUTES.dashboard)}
              className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              대시보드로 돌아가기
            </button>
          ) : null}
        </div>

        <p className="mt-6 text-center">
          <Link
            href={ROUTES.dashboard}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            ← 대시보드
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
              className={`rounded-xl border p-6 shadow-card ${
                active
                  ? "border-brand-200 bg-brand-50/50"
                  : done
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-surface-border bg-white opacity-80"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {index + 1}단계 {done ? "· 완료" : ""}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{s.description}</p>

              {active && s.id === "schedule" ? (
                <div className="mt-4 rounded-lg border border-surface-border bg-white p-3">
                  <ScheduleEditor rows={rows} onChange={handleRowsChange} />
                  {!canConfirm ? (
                    <p className="mt-2 text-xs text-amber-800">
                      최소 1개 시간대에서 요일을 선택해 주세요.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-1 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
                      {rows
                        .filter((row) => row.days.length > 0)
                        .map((row) => (
                          <li key={row.id}>{formatScheduleSentence(row)}</li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {active && s.id === "jobber" && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500">{onboardingPage.jobberHint}</p>
                  <a
                    href="/api/jobber/connect"
                    className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Jobber 계정 연결
                  </a>
                  <p className="text-xs text-slate-500">
                    연결 후 아래 「다음」을 누르세요. 문제 시{" "}
                    <a
                      href={`mailto:${SITE.supportEmail}`}
                      className="text-brand-600 hover:underline"
                    >
                      {SITE.supportEmail}
                    </a>
                  </p>
                </div>
              )}

              {active && s.id === "phone" && (
                <p className="mt-3 text-xs text-slate-500">
                  통신사 설정에서 after-hours·overflow 번호를 Vowpath로
                  포워딩합니다. 파일럿은 지원팀이 안내합니다.
                </p>
              )}

              <button
                type="button"
                disabled={locked || (active && s.id === "schedule" && !canConfirm)}
                onClick={active ? completeStep : undefined}
                className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  locked || (active && s.id === "schedule" && !canConfirm)
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : done
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {locked
                  ? onboardingPage.stepLockedLabel
                  : done
                    ? "완료됨"
                    : s.id === "schedule"
                      ? "확인"
                      : s.action}
              </button>
            </div>
          );
        })}
      </div>

      {step >= steps.length - 1 && shop.forwardingDone && (
        <button
          type="button"
          onClick={finishToDashboard}
          className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
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
          나중에 설정 · 대시보드로 건너뛰기
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
