"use client";

import { useState } from "react";
import type { BriefOverrides } from "@/chaebi/lib/parse";
import type { SituationBrief } from "@/chaebi/lib/types";
import { addDays, formatKoreanDate, seoulDateISO } from "@/chaebi/lib/datetime";
import { formatKrw } from "@/chaebi/lib/format";
import { offlineRegions } from "@/chaebi/lib/regions";
import { Sheet } from "@/chaebi/components/ui/Sheet";

/**
 * 조건 고치기 — 날짜·시간·지역·예산·인원.
 *
 * 첫 화면에서 안 물어본 것들을 여기서 되묻는다. 다만 **비어 있는 폼이 아니라
 * 이미 채워진 값을 고치는 형태**다. 사용자는 아무것도 안 골라도 되고, 틀린
 * 것만 손대면 된다. 이게 이 앱이 예약앱과 갈리는 지점이다.
 */

const BUDGET_PRESETS = [100_000, 200_000, 300_000, 500_000, 1_000_000];
const TIME_PRESETS: [string, string][] = [
  ["점심", "12:30"],
  ["오후", "15:00"],
  ["저녁", "19:00"],
  ["늦은 저녁", "20:30"],
];

export function ConditionSheet({
  open,
  brief,
  onClose,
  onApply,
  busy,
  hasUserPicks,
}: {
  open: boolean;
  brief: SituationBrief;
  onClose: () => void;
  onApply: (overrides: BriefOverrides) => void;
  busy: boolean;
  hasUserPicks: boolean;
}) {
  const today = seoulDateISO();
  const [dateISO, setDateISO] = useState(brief.dateISO);
  const [startTime, setStartTime] = useState(brief.startTime);
  const [regionKey, setRegionKey] = useState(brief.regionKey);
  const [budgetKrw, setBudgetKrw] = useState(brief.budgetKrw);
  const [headcount, setHeadcount] = useState(brief.headcount);

  const datePresets = [
    ["오늘", today],
    ["내일", addDays(today, 1)],
    ["모레", addDays(today, 2)],
    ["이번 주말", nextSaturday(today)],
  ] as const;

  const changed =
    dateISO !== brief.dateISO ||
    startTime !== brief.startTime ||
    regionKey !== brief.regionKey ||
    budgetKrw !== brief.budgetKrw ||
    headcount !== brief.headcount;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="조건 고치기"
      subtitle="바꾸면 그 조건에 맞춰 다시 잡아드립니다"
      footer={
        <>
          {hasUserPicks && changed ? (
            <p className="mb-2.5 text-[12px] leading-relaxed text-cb-warn">
              조건이 바뀌면 직접 고르신 항목도 새로 추천됩니다.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!changed || busy}
            onClick={() => onApply({ dateISO, startTime, regionKey, budgetKrw, headcount })}
            className="cb-btn cb-btn-primary w-full py-3.5 text-[15px]"
          >
            {busy ? "다시 잡는 중…" : "이 조건으로 다시 잡기"}
          </button>
        </>
      }
    >
      <div className="space-y-6 pb-2">
        <Field label="언제">
          <div className="flex flex-wrap gap-2">
            {datePresets.map(([label, value]) => (
              <button
                key={label}
                type="button"
                className="cb-chip"
                data-active={dateISO === value}
                onClick={() => setDateISO(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={dateISO}
            min={today}
            max={addDays(today, 365)}
            onChange={(event) => event.target.value && setDateISO(event.target.value)}
            className="cb-input mt-2.5 text-[15px]"
            aria-label="날짜 직접 선택"
          />
          <p className="mt-1.5 text-[12px] text-cb-subtle">{formatKoreanDate(dateISO)}</p>
        </Field>

        <Field label="몇 시">
          <div className="flex flex-wrap gap-2">
            {TIME_PRESETS.map(([label, value]) => (
              <button
                key={label}
                type="button"
                className="cb-chip"
                data-active={startTime === value}
                onClick={() => setStartTime(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="time"
            value={startTime}
            step={900}
            onChange={(event) => event.target.value && setStartTime(event.target.value)}
            className="cb-input mt-2.5 text-[15px]"
            aria-label="시각 직접 선택"
          />
        </Field>

        <Field label="어디서">
          <div className="flex flex-wrap gap-2">
            {offlineRegions().map((region) => (
              <button
                key={region.key}
                type="button"
                className="cb-chip"
                data-active={regionKey === region.key}
                onClick={() => setRegionKey(region.key)}
              >
                {region.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="예산">
          <div className="flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                className="cb-chip"
                data-active={budgetKrw === value}
                onClick={() => setBudgetKrw(value)}
              >
                {formatKrw(value)}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="range"
              min={50_000}
              max={2_000_000}
              step={10_000}
              value={Math.min(2_000_000, Math.max(50_000, budgetKrw))}
              onChange={(event) => setBudgetKrw(Number(event.target.value))}
              className="h-1.5 w-full accent-cb-primary"
              aria-label="예산 조절"
            />
            <span className="w-24 flex-none text-right text-[14px] font-extrabold tabular-nums text-cb-ink">
              {formatKrw(budgetKrw)}
            </span>
          </div>
        </Field>

        <Field label="몇 명">
          <div className="flex items-center gap-3">
            <Stepper
              value={headcount}
              min={1}
              max={20}
              onChange={setHeadcount}
              label="인원"
            />
            <span className="text-[13px] text-cb-muted">식당 가격은 인원수만큼 계산됩니다</span>
          </div>
        </Field>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-bold text-cb-muted">{label}</h3>
      {children}
    </section>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-cb-border-strong bg-cb-surface p-1">
      <button
        type="button"
        aria-label={`${label} 줄이기`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="cb-btn cb-btn-quiet h-8 w-8 rounded-full p-0 text-[18px] font-bold"
      >
        −
      </button>
      <span className="w-10 text-center text-[15px] font-extrabold tabular-nums text-cb-ink">
        {value}
      </span>
      <button
        type="button"
        aria-label={`${label} 늘리기`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="cb-btn cb-btn-quiet h-8 w-8 rounded-full p-0 text-[18px] font-bold"
      >
        +
      </button>
    </div>
  );
}

function nextSaturday(todayISO: string): string {
  const [y, m, d] = todayISO.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (6 - dow + 7) % 7 || 7;
  return addDays(todayISO, delta);
}
