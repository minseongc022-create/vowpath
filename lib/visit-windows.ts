type VisitWindowFields = {
  amWindowStart: number;
  amWindowEnd: number;
  pmWindowStart: number;
  pmWindowEnd: number;
  businessDayStartHour?: number;
  businessDayEndHour?: number;
};

/** Hour options for visit-window pickers (5 AM – 10 PM). */
export const VISIT_HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 5);

/** PM window collapsed → single continuous booking block (am start → am end). */
export function isContinuousVisitWindows(
  settings: Pick<VisitWindowFields, "amWindowStart" | "amWindowEnd" | "pmWindowStart" | "pmWindowEnd">,
): boolean {
  return settings.pmWindowStart >= settings.pmWindowEnd;
}

export function getVisitWindowsForSlots(
  settings: Pick<VisitWindowFields, "amWindowStart" | "amWindowEnd" | "pmWindowStart" | "pmWindowEnd">,
): { startH: number; endH: number }[] {
  if (isContinuousVisitWindows(settings)) {
    return [{ startH: settings.amWindowStart, endH: settings.amWindowEnd }];
  }
  return [
    { startH: settings.amWindowStart, endH: settings.amWindowEnd },
    { startH: settings.pmWindowStart, endH: settings.pmWindowEnd },
  ];
}

export function patchContinuousVisitWindow(
  startHour: number,
  endHour: number,
): Partial<VisitWindowFields> | null {
  const start = Math.min(23, Math.max(0, Math.round(startHour)));
  const end = Math.min(23, Math.max(0, Math.round(endHour)));
  if (start >= end) return null;
  return {
    amWindowStart: start,
    amWindowEnd: end,
    pmWindowStart: end,
    pmWindowEnd: end,
    businessDayStartHour: start,
    businessDayEndHour: end,
  };
}

export const VISIT_WINDOW_PRESETS = {
  splitStandard: {
    amWindowStart: 8,
    amWindowEnd: 12,
    pmWindowStart: 12,
    pmWindowEnd: 17,
  },
  continuousFullDay: {
    amWindowStart: 8,
    amWindowEnd: 17,
    pmWindowStart: 17,
    pmWindowEnd: 17,
  },
  continuousExtended: {
    amWindowStart: 7,
    amWindowEnd: 19,
    pmWindowStart: 19,
    pmWindowEnd: 19,
  },
} as const;

export function formatVisitHourLabel(hour: number): string {
  const h = Math.min(23, Math.max(0, Math.round(hour)));
  const ap = h >= 12 ? "PM" : "AM";
  const hs = h % 12 || 12;
  return `${hs} ${ap}`;
}

export function sanitizeVisitWindowPatch(
  patch: Partial<VisitWindowFields>,
): Partial<VisitWindowFields> | null {
  const clamp = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(23, Math.max(0, Math.round(n))) : null;

  const amStart = clamp(patch.amWindowStart);
  const amEnd = clamp(patch.amWindowEnd);
  const pmStart = clamp(patch.pmWindowStart);
  const pmEnd = clamp(patch.pmWindowEnd);

  if (amStart === null || amEnd === null || pmStart === null || pmEnd === null) return null;
  if (amStart >= amEnd || pmStart >= pmEnd || amEnd > pmStart) return null;

  return {
    amWindowStart: amStart,
    amWindowEnd: amEnd,
    pmWindowStart: pmStart,
    pmWindowEnd: pmEnd,
    businessDayStartHour: amStart,
    businessDayEndHour: pmEnd,
  };
}
