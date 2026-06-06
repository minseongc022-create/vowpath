import type {
  AiInsight,
  BookingTrendPoint,
  NamedCount,
  OperationsMetrics,
} from "./operations-analytics";

export type InsightInput = {
  kpis: OperationsMetrics["kpis"];
  rangeCalls: number;
  rangeBookings: number;
  prevCalls: number;
  prevBookings: number;
  prevEmergencyCalls: number;
  prevAfterHoursCalls: number;
  hourly: NamedCount[];
  dayOfWeek: NamedCount[];
  emergencyBreakdown: NamedCount[];
  zipAnalysis: NamedCount[];
  bookingTrend: BookingTrendPoint[];
  jobberConnected: boolean;
  jobberBookingsInRange: number;
  jobberConvertedCount: number;
  periodDays: number;
};

type ScoredInsight = AiInsight & { score: number };

function topEntry(items: NamedCount[]): NamedCount | null {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return sorted[0]?.value > 0 ? sorted[0] : null;
}

function sumValues(items: NamedCount[]): number {
  return items.reduce((acc, item) => acc + item.value, 0);
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatDelta(current: number, previous: number): string {
  const delta = current - previous;
  if (delta === 0) return "unchanged vs prior period";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} vs prior period (${previous} → ${current})`;
}

function formatPctDelta(currentPct: number, deltaPts: number): string {
  const sign = deltaPts >= 0 ? "+" : "";
  return `${currentPct}% (${sign}${deltaPts} pts vs prior)`;
}

function weekdayWeekendSplit(dayOfWeek: NamedCount[]) {
  const weekend = (dayOfWeek[0]?.value ?? 0) + (dayOfWeek[6]?.value ?? 0);
  const weekday = dayOfWeek.slice(1, 6).reduce((acc, d) => acc + d.value, 0);
  return { weekend, weekday, total: weekend + weekday };
}

function trendMomentum(trend: BookingTrendPoint[]) {
  if (trend.length < 4) return null;
  const half = Math.floor(trend.length / 2);
  const firstHalf = trend.slice(0, half);
  const secondHalf = trend.slice(half);
  const firstCalls = firstHalf.reduce((a, p) => a + p.calls, 0);
  const secondCalls = secondHalf.reduce((a, p) => a + p.calls, 0);
  const firstBookings = firstHalf.reduce((a, p) => a + p.bookings, 0);
  const secondBookings = secondHalf.reduce((a, p) => a + p.bookings, 0);
  return { firstCalls, secondCalls, firstBookings, secondBookings, halfDays: half };
}

function zeroBookingHighCallDays(trend: BookingTrendPoint[]): BookingTrendPoint[] {
  return trend.filter((p) => p.calls >= 2 && p.bookings === 0);
}

export function generateOperationsInsights(input: InsightInput): AiInsight[] {
  const {
    kpis,
    rangeCalls,
    rangeBookings,
    prevCalls,
    prevBookings,
    prevEmergencyCalls,
    prevAfterHoursCalls,
    hourly,
    dayOfWeek,
    emergencyBreakdown,
    zipAnalysis,
    bookingTrend,
    jobberConnected,
    jobberBookingsInRange,
    jobberConvertedCount,
    periodDays,
  } = input;

  const candidates: ScoredInsight[] = [];
  const hasActivity = rangeCalls > 0 || jobberBookingsInRange > 0;

  if (!hasActivity) {
    return [
      {
        id: "empty",
        tone: "neutral",
        title: "No activity in this range",
        body: jobberConnected
          ? "0 calls and 0 Jobber requests in this period. Data will appear when inbound calls or Jobber work requests are recorded."
          : "0 calls and 0 bookings in this period. Connect Twilio or Jobber to start tracking shop performance.",
      },
    ];
  }

  const avgCallsPerDay =
    periodDays > 0 ? Math.round((rangeCalls / periodDays) * 10) / 10 : 0;
  const avgBookingsPerDay =
    periodDays > 0 ? Math.round((rangeBookings / periodDays) * 10) / 10 : 0;

  if (rangeCalls > 0) {
    candidates.push({
      id: "period-summary",
      score: 95,
      tone: "neutral",
      title: "Period summary",
      body: `${rangeCalls} inbound call${rangeCalls === 1 ? "" : "s"} (${formatDelta(rangeCalls, prevCalls)}), ${rangeBookings} booking${rangeBookings === 1 ? "" : "s"} (${formatDelta(rangeBookings, prevBookings)}). Avg ${avgCallsPerDay} calls/day, ${avgBookingsPerDay} bookings/day over ${periodDays} day${periodDays === 1 ? "" : "s"}.`,
    });
  } else if (jobberBookingsInRange > 0) {
    candidates.push({
      id: "jobber-only-summary",
      score: 95,
      tone: "neutral",
      title: "Jobber activity summary",
      body: `${jobberBookingsInRange} Jobber work request${jobberBookingsInRange === 1 ? "" : "s"} in this period (${formatDelta(jobberBookingsInRange, prevBookings)}). No inbound calls logged yet — conversion metrics need call volume.`,
    });
  }

  if (rangeCalls > 0 && rangeBookings > 0) {
    const missed = Math.max(rangeCalls - rangeBookings, 0);
    const tone =
      kpis.conversionRate >= 50
        ? "positive"
        : kpis.conversionRate < 30
          ? "alert"
          : "neutral";
    candidates.push({
      id: "conversion-stat",
      score: 88 + Math.abs(kpis.conversionDelta),
      tone,
      title:
        kpis.conversionDelta >= 5
          ? "Conversion improving"
          : kpis.conversionDelta <= -5
            ? "Conversion declining"
            : "Call-to-booking rate",
      body: `${rangeBookings} of ${rangeCalls} calls became bookings — ${formatPctDelta(kpis.conversionRate, kpis.conversionDelta)}. ${missed} call${missed === 1 ? "" : "s"} did not convert in this period.`,
    });
  } else if (rangeCalls >= 3 && rangeBookings === 0) {
    candidates.push({
      id: "zero-conversion",
      score: 90,
      tone: "alert",
      title: "Zero bookings from calls",
      body: `${rangeCalls} inbound calls with 0 bookings recorded. Check Jobber push failures, after-hours routing, or dispatcher follow-up on open requests.`,
    });
  }

  const peakHour = topEntry(hourly);
  if (peakHour && rangeCalls > 0) {
    const share = pct(peakHour.value, rangeCalls);
    candidates.push({
      id: "peak-hour",
      score: 70 + share,
      tone: share >= 25 ? "alert" : "neutral",
      title: "Busiest hour",
      body: `${peakHour.value} call${peakHour.value === 1 ? "" : "s"} (${share}% of volume) arrived around ${peakHour.label}. ${share >= 25 ? "Consider staffing or AI coverage at this hour." : "Volume is spread across the day."}`,
    });
  }

  const peakDay = topEntry(dayOfWeek);
  if (peakDay && rangeCalls > 0) {
    const share = pct(peakDay.value, rangeCalls);
    candidates.push({
      id: "peak-dow",
      score: 65 + share,
      tone: "neutral",
      title: "Busiest weekday",
      body: `${peakDay.label} leads with ${peakDay.value} call${peakDay.value === 1 ? "" : "s"} (${share}% of call volume).`,
    });
  }

  const { weekend, weekday, total: dowTotal } = weekdayWeekendSplit(dayOfWeek);
  if (dowTotal >= 5 && weekend > 0) {
    const weekendShare = pct(weekend, dowTotal);
    candidates.push({
      id: "weekend-share",
      score: 55 + weekendShare,
      tone: weekendShare >= 40 ? "alert" : "neutral",
      title: "Weekend call share",
      body: `${weekend} weekend call${weekend === 1 ? "" : "s"} vs ${weekday} weekday (${weekendShare}% on Sat–Sun). ${weekendShare >= 40 ? "Weekend demand is high — verify after-hours AI and emergency dispatch." : "Weekday volume dominates."}`,
    });
  }

  const p1 = emergencyBreakdown.find((e) => e.key === "P1")?.value ?? 0;
  const p2 = emergencyBreakdown.find((e) => e.key === "P2")?.value ?? 0;
  const p3 = emergencyBreakdown.find((e) => e.key === "P3")?.value ?? 0;
  const unclassified =
    emergencyBreakdown.find((e) => e.key === "none")?.value ?? 0;
  const priorityTotal = p1 + p2 + p3 + unclassified;

  if (kpis.emergencyCalls > 0 && rangeCalls > 0) {
    const share = pct(kpis.emergencyCalls, rangeCalls);
    candidates.push({
      id: "emergency-load",
      score: 75 + share,
      tone: share >= 30 ? "alert" : share >= 15 ? "neutral" : "positive",
      title: "P1 emergency volume",
      body: `${kpis.emergencyCalls} P1 call${kpis.emergencyCalls === 1 ? "" : "s"} (${share}% of ${rangeCalls} calls, ${formatDelta(kpis.emergencyCalls, prevEmergencyCalls)}). P2: ${p2}, P3: ${p3}${unclassified > 0 ? `, unclassified: ${unclassified}` : ""}.`,
    });
  } else if (priorityTotal > 0 && p1 === 0) {
    candidates.push({
      id: "no-emergency",
      score: 50,
      tone: "positive",
      title: "No P1 emergencies",
      body: `${priorityTotal} prioritized call${priorityTotal === 1 ? "" : "s"} in this period with 0 P1 emergencies. P2: ${p2}, P3: ${p3}.`,
    });
  }

  if (kpis.afterHoursHandled > 0 && rangeCalls > 0) {
    const share = pct(kpis.afterHoursHandled, rangeCalls);
    candidates.push({
      id: "after-hours",
      score: 60 + share,
      tone: share >= 50 ? "alert" : "positive",
      title: "After-hours intake",
      body: `${kpis.afterHoursHandled} of ${rangeCalls} calls (${share}%) arrived outside Mon–Fri 8am–5pm (${formatDelta(kpis.afterHoursHandled, prevAfterHoursCalls)}). ${share >= 50 ? "Night/weekend demand is a major share — confirm AI answer schedule." : "AI after-hours coverage is capturing off-hours demand."}`,
    });
  }

  const momentum = trendMomentum(bookingTrend);
  if (momentum && momentum.firstCalls + momentum.secondCalls >= 4) {
    const callChange = momentum.secondCalls - momentum.firstCalls;
    const bookingChange = momentum.secondBookings - momentum.firstBookings;
    const callTone = callChange > 0 ? "alert" : callChange < 0 ? "positive" : "neutral";
    candidates.push({
      id: "trend-momentum",
      score: 72 + Math.abs(callChange) + Math.abs(bookingChange),
      tone: bookingChange > 0 ? "positive" : callTone,
      title: "Second-half trend",
      body: `Last ${momentum.halfDays} days: ${momentum.secondCalls} calls & ${momentum.secondBookings} bookings vs first ${momentum.halfDays} days: ${momentum.firstCalls} calls & ${momentum.firstBookings} bookings (${callChange >= 0 ? "+" : ""}${callChange} calls, ${bookingChange >= 0 ? "+" : ""}${bookingChange} bookings).`,
    });
  }

  const leakyDays = zeroBookingHighCallDays(bookingTrend);
  if (leakyDays.length >= 2 && rangeBookings < rangeCalls) {
    const examples = leakyDays
      .slice(0, 3)
      .map((d) => d.label)
      .join(", ");
    candidates.push({
      id: "leaky-days",
      score: 78,
      tone: "alert",
      title: "High-call, zero-booking days",
      body: `${leakyDays.length} day${leakyDays.length === 1 ? "" : "s"} had 2+ calls but 0 bookings (e.g. ${examples}). Review dispatcher notes or Jobber push on those dates.`,
    });
  }

  const topZip = zipAnalysis[0];
  const zipTotal = sumValues(zipAnalysis);
  if (topZip && zipTotal > 0) {
    const share = pct(topZip.value, zipTotal);
    const runner = zipAnalysis[1];
    candidates.push({
      id: "top-zip",
      score: 58 + share,
      tone: share >= 50 ? "alert" : "neutral",
      title: "Geographic concentration",
      body: `ZIP ${topZip.label}: ${topZip.value} event${topZip.value === 1 ? "" : "s"} (${share}% of tracked addresses${runner ? `; #2 is ${runner.label} with ${runner.value}` : ""}). ${share >= 50 ? "Demand is concentrated — plan technician routing." : "Demand is spread across service areas."}`,
    });
  }

  if (jobberConnected && jobberBookingsInRange > 0) {
    const convertedShare = pct(jobberConvertedCount, jobberBookingsInRange);
    candidates.push({
      id: "jobber-pipeline",
      score: 80,
      tone: convertedShare >= 40 ? "positive" : "neutral",
      title: "Jobber request pipeline",
      body: `${jobberBookingsInRange} Jobber request${jobberBookingsInRange === 1 ? "" : "s"} synced; ${jobberConvertedCount} converted or completed (${convertedShare}%). ${rangeCalls > 0 ? `${Math.max(jobberBookingsInRange - rangeBookings, 0)} requests may have originated outside tracked calls.` : "Connect Twilio to measure call-to-request conversion."}`,
    });
  }

  if (unclassified >= 2 && rangeCalls > 0) {
    const share = pct(unclassified, rangeCalls);
    candidates.push({
      id: "unclassified",
      score: 68 + share,
      tone: "alert",
      title: "Unclassified call priority",
      body: `${unclassified} call${unclassified === 1 ? "" : "s"} (${share}%) lack P1/P2/P3 tagging. IVR menu or AI triage may need tuning for clearer priority capture.`,
    });
  }

  if (kpis.bookingsDelta >= 20 && rangeBookings > 0) {
    candidates.push({
      id: "bookings-surge",
      score: 85,
      tone: "positive",
      title: "Booking volume surge",
      body: `Bookings up ${kpis.bookingsDelta}% vs prior period (${prevBookings} → ${rangeBookings}). Ensure dispatch capacity matches demand.`,
    });
  } else if (kpis.bookingsDelta <= -20 && prevBookings > 0) {
    candidates.push({
      id: "bookings-drop",
      score: 85,
      tone: "alert",
      title: "Booking volume drop",
      body: `Bookings down ${Math.abs(kpis.bookingsDelta)}% vs prior period (${prevBookings} → ${rangeBookings}). Check marketing seasonality, missed calls, or Jobber sync gaps.`,
    });
  }

  const ranked = candidates
    .sort((a, b) => b.score - a.score)
    .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

  return ranked.slice(0, 5).map(({ score: _score, ...insight }) => insight);
}
