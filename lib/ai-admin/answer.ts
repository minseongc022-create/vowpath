import {
  isApprovedBooking,
  isPendingShopReview,
  REQUEST_STATUS_LABELS,
} from "../booking-policy";
import { buildDailyBriefing } from "../dashboard-briefing";
import { isNoCoolingText } from "../urgent-requests";
import type { EffiroadAiAction, EffiroadAiResponse } from "../effiroad-ai-query";
import {
  bookingStatusOf,
  buildAiContextPack,
  endOfDay,
  eventOnDay,
  inRange,
  isUrgentBooking,
  isUrgentCall,
  schedulingModeLabel,
  snapshotLines,
  startOfDay,
  weekStart,
  type AiContextPack,
} from "./context-pack";
import {
  actionLabels,
  composeAssistantReply,
  composeCountReply,
  composeEmptyResult,
  defaultSuggestions,
} from "./compose";
import type { AiQueryIntent } from "./intents";
import { listWorkflowRules } from "../workflow-rules/store";
import { summarizeWorkflowRule } from "../workflow-rules/format";
import { searchCallRag } from "../call-rag";
import type { RecentBooking } from "../recent-bookings";

function labels(pack: AiContextPack) {
  return actionLabels(pack.locale);
}

function defaultActions(pack: AiContextPack): EffiroadAiAction[] {
  const L = labels(pack);
  return [
    { label: L.pendingApprovals, href: "/dashboard/bookings" },
    { label: L.urgentRequests, href: "/dashboard/bookings" },
    { label: L.recentCalls, href: "/dashboard/missed-calls" },
    { label: L.calendar, href: "/dashboard/calendar" },
    { label: L.weekBookings, href: "/dashboard/calendar" },
  ];
}

function bookingItem(pack: AiContextPack, booking: RecentBooking) {
  const status = bookingStatusOf(pack, booking);
  return {
    id: booking.id,
    title: booking.customerName,
    subtitle: `${booking.issueType} · ${booking.arrivalWindow ?? ("No requested time")}`,
    href: `/dashboard/bookings/${encodeURIComponent(booking.id)}`,
    status: REQUEST_STATUS_LABELS[status],
  };
}

function actionsForBooking(pack: AiContextPack, booking: RecentBooking | null): EffiroadAiAction[] {
  const L = labels(pack);
  const base = defaultActions(pack);
  if (!booking) return base;
  const status = bookingStatusOf(pack, booking);
  const actions: EffiroadAiAction[] = [
    { label: L.bookingDetails, href: `/dashboard/bookings/${encodeURIComponent(booking.id)}` },
    { label: L.callHistory, href: "/dashboard/missed-calls" },
    { label: L.calendar, href: "/dashboard/calendar" },
  ];
  if (booking.jobberJobId) {
    actions.push({ label: L.openJobber, href: booking.jobberJobId });
  }
  if (isPendingShopReview(status)) {
    actions.push({ label: L.approve, kind: "approve", bookingId: booking.id });
    actions.push({ label: L.decline, kind: "decline", bookingId: booking.id });
  }
  return [...actions, ...base.slice(0, 2)];
}

function listResponse(
  pack: AiContextPack,
  headline: string,
  bookings: RecentBooking[],
  partial = false,
): EffiroadAiResponse {
  if (bookings.length === 0) {
    return {
      answer: composeEmptyResult({
        locale: pack.locale,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: headline,
        snapshotLines: snapshotLines(pack),
      }),
      rows: snapshotLines(pack).map((line, i) => ({
        label: "Status",
        value: line,
      })),
      actions: defaultActions(pack),
      suggestions: defaultSuggestions(pack.locale),
    };
  }
  return {
    answer: composeAssistantReply({
      locale: pack.locale,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline,
        bullets: bookings.slice(0, 3).map(
          (b) =>
            `${b.customerName} — ${b.issueType} (${REQUEST_STATUS_LABELS[bookingStatusOf(pack, b)]})`,
        ),
        partial,
      },
    }),
    items: bookings.slice(0, 10).map((b) => bookingItem(pack, b)),
    actions: actionsForBooking(pack, bookings[0]),
    suggestions: defaultSuggestions(pack.locale),
  };
}

function handleCustomer(pack: AiContextPack, name: string): EffiroadAiResponse {
  const needle = name.toLowerCase();
  const bookings = pack.bookings.filter((b) => b.customerName.toLowerCase().includes(needle));
  const calls = pack.calls.filter((c) => (c.customerName ?? "").toLowerCase().includes(needle));

  if (bookings.length === 0 && calls.length === 0) {
    const similar = pack.bookings
      .filter((b) => {
        const parts = needle.split(/\s+/);
        return parts.some((p) => b.customerName.toLowerCase().includes(p));
      })
      .slice(0, 5);
    if (similar.length > 0) {
      return listResponse(
        pack,
        `I couldn't find an exact match for "${name}", but I found ${similar.length} similar customer record${similar.length === 1 ? "" : "s"}.`,
        similar,
        true,
      );
    }
    return {
      answer: composeEmptyResult({
        locale: pack.locale,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: `customer "${name}"`,
        snapshotLines: snapshotLines(pack),
      }),
      actions: defaultActions(pack),
      suggestions: defaultSuggestions(pack.locale),
    };
  }

  const latestBooking = bookings[0] ?? null;
  const latestCall = calls.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  const status = latestBooking ? REQUEST_STATUS_LABELS[bookingStatusOf(pack, latestBooking)] : "—";
  const issue =
    latestBooking?.issueType ?? latestCall?.issueType ?? latestCall?.symptom ?? "—";

  const displayName = latestBooking?.customerName ?? latestCall?.customerName ?? name;
  const headline =
    `I found ${displayName}.`;
  const bullets = [
    `Latest request: ${issue} — status: ${status}`,
    `${calls.length} recent call${calls.length === 1 ? "" : "s"} · ${bookings.length} request${bookings.length === 1 ? "" : "s"}`,
  ];

  return {
    answer: composeAssistantReply({
      locale: pack.locale,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline, bullets },
    }),
    customer: {
      name: displayName,
      fields: [
        {
          label: "Phone",
          value: latestCall?.callbackPhone ?? latestCall?.from ?? "—",
        },
        {
          label: "Address",
          value: latestBooking?.address ?? latestCall?.address ?? "—",
        },
        { label: "Status", value: status },
        { label: "Service", value: issue },
      ],
    },
    items: bookings.slice(0, 5).map((b) => bookingItem(pack, b)),
    actions: actionsForBooking(pack, latestBooking),
    suggestions: [`${displayName} call history`, "Show pending approvals", "Show urgent requests"],
  };
}

function handleCallMemory(pack: AiContextPack): EffiroadAiResponse {
  const memory = pack.callMemory;
  if (memory.length === 0) {
    return {
      answer: composeEmptyResult({
        locale: pack.locale,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: "call memory",
        snapshotLines: snapshotLines(pack),
      }),
      actions: defaultActions(pack),
      suggestions: defaultSuggestions(pack.locale),
    };
  }
  const selected = memory[0];
  const headline =
    `Here's the latest call summary for ${selected.customerName}.`;
  const bullets = [
    `Issue: ${selected.issue}`,
    selected.summary,
  ];
  return {
    answer: composeAssistantReply({
      locale: pack.locale,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline, bullets },
    }),
    rows: [
      { label: "Customer", value: selected.customerName },
      { label: "Phone", value: selected.phoneNumber || "—" },
      { label: "Status", value: REQUEST_STATUS_LABELS[selected.bookingStatus] },
      { label: "Summary", value: selected.summary },
    ],
    actions: actionsForBooking(
      pack,
      pack.bookings.find((b) => b.id === selected.bookingId) ?? null,
    ),
    suggestions: defaultSuggestions(pack.locale),
  };
}

function handlePolicy(pack: AiContextPack): EffiroadAiResponse {
  const m = pack.companyMemory;
  const loc = pack.locale;
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline: "Here is your saved company policy.",
      },
    }),
    rows: [
      { label: "Service Areas", value: m.serviceAreas || ("Not saved") },
      { label: "Business Hours", value: m.businessHours || ("Not saved") },
      { label: "Holiday Rules", value: m.holidayRules || ("Not saved") },
      { label: "Emergency Policy", value: m.emergencyPolicy || ("Not saved") },
      { label: "Approval Policy", value: m.approvalPolicy || ("Not saved") },
    ],
    actions: [
      { label: labels(pack).editMemory, href: "/dashboard/settings" },
      { label: labels(pack).openSettings, href: "/dashboard/settings" },
    ],
    suggestions: defaultSuggestions(loc),
  };
}

function handleSettingsRead(pack: AiContextPack): EffiroadAiResponse {
  const loc = pack.locale;
  const s = pack.bookingSettings;
  const m = pack.companyMemory;
  const mode = schedulingModeLabel(s.schedulingMode, loc);
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline: "Here are your current shop settings.",
        bullets: [
          `Booking policy: ${mode}`,
          `Morning SMS briefing: ${m.dailyBriefingSmsEnabled ? "On" : "Off"} (${m.dailyBriefingSmsTime})`,
          `AI phone answering: ${pack.shopProfile.answerScheduleActive ? "Active" : "Inactive"}`,
        ],
      },
    }),
    rows: [
      { label: "Booking policy", value: mode },
      { label: "Approval SMS", value: s.ownerApprovalSms },
      { label: "Morning Briefing", value: m.dailyBriefingSmsEnabled ? "On" : "Off" },
      { label: "Briefing Time", value: m.dailyBriefingSmsTime },
    ],
    actions: [{ label: labels(pack).openSettings, href: "/dashboard/settings" }],
    suggestions: ["Add a weekend manual-approval rule", "Turn off morning SMS", "Show service areas"],
  };
}

function handleAutomationRules(pack: AiContextPack): EffiroadAiResponse {
  const loc = pack.locale;
  const rules = pack.workflowRules;
  if (!rules.length) {
    return {
      answer: composeAssistantReply({
        locale: loc,
        now: pack.now,
        ownerName: pack.ownerName,
        facts: {
          headline:
            "You don't have any automation rules yet. You can create one in plain language.",
          bullets: ['Try: "Auto approve No Cooling"', '"Weekend bookings need approval"'],
        },
      }),
      actions: [
        { label: "Open Settings", href: "/dashboard/settings" },
        { label: "Effiroad AI", href: "/dashboard/ai" },
      ],
      suggestions: ["Auto approve No Cooling", "Gas smell is always urgent"],
    };
  }

  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline:
          `${rules.filter((r) => r.enabled).length} active automation rule${rules.length === 1 ? "" : "s"} (${rules.length} total)`,
        bullets: rules.slice(0, 6).map((r) => summarizeWorkflowRule(r, loc)),
      },
    }),
    items: rules.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: summarizeWorkflowRule(r, loc),
      status: r.enabled ? ("Active") : "Inactive",
    })),
    actions: [{ label: "Manage in Settings", href: "/dashboard/settings" }],
    suggestions: ["Auto approve No Cooling", "Weekend bookings need approval"],
  };
}

function handleIntegration(pack: AiContextPack): EffiroadAiResponse {
  const loc = pack.locale;
  const live = pack.snapshot.integrationLive;
  const headline = live
    ? "Your shop is live — Effiroad can answer calls on your configured schedule."
    : "Setup isn't complete yet. Finish contact, schedule, and call forwarding to go live.";
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline },
    }),
    rows: [
      { label: "Live", value: live ? ("Yes") : ("No") },
      { label: "Jobber", value: pack.snapshot.jobberConnected ? ("Connected") : ("Not connected") },
      { label: "AI answering", value: pack.shopProfile.answerScheduleActive ? ("On") : ("Off") },
    ],
    actions: [{ label: labels(pack).openSettings, href: "/dashboard/settings" }],
    suggestions: defaultSuggestions(loc),
  };
}

function handleCalendarToday(pack: AiContextPack): EffiroadAiResponse {
  const events = pack.calendarEvents.filter((e) => eventOnDay(e, pack.now));
  const loc = pack.locale;
  const headline =
    `You have ${events.length} visit${events.length === 1 ? "" : "s"} scheduled today.`;
  if (events.length === 0) {
    return {
      answer: composeEmptyResult({
        locale: loc,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: "today's schedule",
        snapshotLines: snapshotLines(pack),
      }),
      actions: [{ label: labels(pack).calendar, href: "/dashboard/calendar" }],
      suggestions: defaultSuggestions(loc),
    };
  }
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline,
        bullets: events.slice(0, 5).map((e) => `${e.timeLabel} — ${e.customerName} (${e.issue})`),
      },
    }),
    items: events.slice(0, 10).map((e) => ({
      id: e.id,
      title: e.customerName,
      subtitle: `${e.timeLabel} · ${e.issue}`,
      href: e.bookingId ? `/dashboard/bookings/${encodeURIComponent(e.bookingId)}` : "/dashboard/calendar",
    })),
    actions: [{ label: labels(pack).calendar, href: "/dashboard/calendar" }],
    suggestions: defaultSuggestions(loc),
  };
}

function handleGeneral(pack: AiContextPack, query: string): EffiroadAiResponse {
  const loc = pack.locale;
  const ragHits = searchCallRag({
    query,
    callMemory: pack.callMemory,
    calls: pack.calls,
    limit: 5,
  });
  if (ragHits.length > 0) {
    return {
      answer: composeAssistantReply({
        locale: loc,
        now: pack.now,
        ownerName: pack.ownerName,
        facts: {
          headline:
            `I found ${ragHits.length} related call${ragHits.length === 1 ? "" : "s"} in your records.`,
          bullets: ragHits.map((h) => `${h.customerName} — ${h.issue}: ${h.summary}`),
        },
      }),
      items: ragHits.map((h) => ({
        id: h.id,
        title: h.customerName,
        subtitle: h.issue,
        status: h.summary.slice(0, 80),
      })),
      actions: defaultActions(pack),
      suggestions: defaultSuggestions(loc),
    };
  }

  const s = pack.snapshot;
  const headline =
    "Here's a quick snapshot of your shop right now.";
  const bullets = snapshotLines(pack);
  if (s.pendingCount > 0) {
    bullets.push(
      `${s.pendingCount} request${s.pendingCount === 1 ? "" : "s"} need your approval.`,
    );
  }
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline, bullets },
    }),
    rows: bullets.map((b) => ({ label: "Summary", value: b })),
    actions: defaultActions(pack),
    suggestions: defaultSuggestions(loc),
  };
}

function handleChitchat(pack: AiContextPack): EffiroadAiResponse {
  const loc = pack.locale;
  const name = pack.ownerName?.trim();
  return {
    answer: [
      name
        ? `Hi ${name} — I'm Effiroad AI, your shop assistant.`
        : "Hi — I'm Effiroad AI, your shop assistant.",
      "Ask about pending approvals, today's calls, a customer name, or where a setting lives.",
    ].join("\n\n"),
    actions: defaultActions(pack),
    suggestions: defaultSuggestions(loc),
  };
}

export function answerAiQuestion(query: string, pack: AiContextPack, intent: AiQueryIntent): EffiroadAiResponse {
  const now = pack.now;
  const today = { start: startOfDay(now), end: endOfDay(now) };
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = { start: startOfDay(yesterdayDate), end: endOfDay(yesterdayDate) };
  const week = { start: weekStart(now), end: endOfDay(now) };
  const loc = pack.locale;

  switch (intent.kind) {
    case "proactive":
      return buildProactiveBriefing(pack);
    case "chitchat":
      return handleChitchat(pack);
    case "customer":
      return handleCustomer(pack, intent.name);
    case "call_memory":
      return handleCallMemory(pack);
    case "policy":
      return handlePolicy(pack);
    case "settings_read":
      return handleSettingsRead(pack);
    case "integration_status":
      return handleIntegration(pack);
    case "automation_rules":
      return handleAutomationRules(pack);
    case "calendar_today":
      return handleCalendarToday(pack);
    case "calendar_week": {
      const events = pack.calendarEvents.filter((e) => inRange(e.startAt, week.start, week.end));
      return {
        answer: composeAssistantReply({
          locale: loc,
          now,
          ownerName: pack.ownerName,
          facts: {
            headline:
              `You have ${events.length} scheduled event${events.length === 1 ? "" : "s"} this week.`,
            bullets: events.slice(0, 5).map((e) => `${e.timeLabel} — ${e.customerName}`),
          },
        }),
        items: events.slice(0, 10).map((e) => ({
          id: e.id,
          title: e.customerName,
          subtitle: e.timeLabel,
          href: e.bookingId ? `/dashboard/bookings/${encodeURIComponent(e.bookingId)}` : "/dashboard/calendar",
        })),
        actions: [{ label: labels(pack).calendar, href: "/dashboard/calendar" }],
        suggestions: defaultSuggestions(loc),
      };
    }
    case "calls_today":
      return {
        answer: composeCountReply({
          locale: loc,
          now,
          ownerName: pack.ownerName,
          label: "Calls today",
          count: pack.snapshot.callsToday,
        }),
        rows: [{ label: "Calls today", value: String(pack.snapshot.callsToday) }],
        actions: [{ label: labels(pack).recentCalls, href: "/dashboard/missed-calls" }],
        suggestions: defaultSuggestions(loc),
      };
    case "pending_approvals": {
      const pending = pack.bookings.filter((b) => isPendingShopReview(bookingStatusOf(pack, b)));
      return listResponse(
        pack,
        `You have ${pending.length} pending approval${pending.length === 1 ? "" : "s"}.`,
        pending,
      );
    }
    case "urgent_requests": {
      const urgent = pack.bookings.filter(isUrgentBooking);
      return listResponse(
        pack,
        `You have ${urgent.length} urgent request${urgent.length === 1 ? "" : "s"}.`,
        urgent,
      );
    }
    case "bookings_week": {
      const weekBookings = pack.bookings.filter(
        (b) => inRange(b.createdAt, week.start, week.end) && isApprovedBooking(bookingStatusOf(pack, b)),
      );
      return listResponse(
        pack,
        `You have ${weekBookings.length} confirmed booking${weekBookings.length === 1 ? "" : "s"} this week.`,
        weekBookings,
      );
    }
    case "after_hours": {
      const afterHours = pack.calls.filter((call) => {
        const d = new Date(call.createdAt);
        const hour = d.getHours();
        const day = d.getDay();
        return day === 0 || day === 6 || hour < 8 || hour >= 17;
      });
      return {
        answer: composeCountReply({
          locale: loc,
          now,
          ownerName: pack.ownerName,
          label: "After-hours calls",
          count: afterHours.length,
        }),
        rows: [{ label: "After-hours calls", value: String(afterHours.length) }],
        actions: [{ label: labels(pack).recentCalls, href: "/dashboard/missed-calls" }],
        suggestions: defaultSuggestions(loc),
      };
    }
    case "no_cooling": {
      const lastWeekStart = new Date(week.start);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(week.start);
      lastWeekEnd.setMilliseconds(-1);
      const noCooling = pack.bookings.filter(
        (b) =>
          isNoCoolingText(b.issueType) &&
          (!intent.lastWeek || inRange(b.createdAt, lastWeekStart, lastWeekEnd)),
      );
      return listResponse(
        pack,
        `Found ${noCooling.length} no-cooling request${noCooling.length === 1 ? "" : "s"}.`,
        noCooling,
      );
    }
    case "yesterday": {
      const briefing = buildDailyBriefing({
        calls: pack.calls,
        jobs: pack.jobs,
        jobberBookings: pack.jobberBookings,
        requestStatuses: pack.requestStatuses,
        now,
      });
      const yCalls = pack.calls.filter((c) => inRange(c.createdAt, yesterday.start, yesterday.end));
      if (yCalls.length === 0 && briefing.summary.length === 0) {
        return {
          answer: composeEmptyResult({
            locale: loc,
            now,
            ownerName: pack.ownerName,
            topic: "yesterday's activity",
            snapshotLines: snapshotLines(pack),
          }),
          actions: defaultActions(pack),
          suggestions: defaultSuggestions(loc),
        };
      }
      return {
        answer: composeAssistantReply({
          locale: loc,
          now,
          ownerName: pack.ownerName,
          facts: {
            headline: "Here's what happened yesterday.",
            bullets: briefing.summary.length ? briefing.summary : [`${yCalls.length} calls`],
          },
        }),
        actions: defaultActions(pack),
        suggestions: defaultSuggestions(loc),
      };
    }
    case "busiest_day": {
      const days = new Map<string, number>();
      for (const call of pack.calls.filter((c) => inRange(c.createdAt, week.start, week.end))) {
        const key = new Date(call.createdAt).toLocaleDateString("en-US", {
          weekday: "long",
        });
        days.set(key, (days.get(key) ?? 0) + 1);
      }
      const busiest = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!busiest) {
        return {
          answer: composeEmptyResult({
            locale: loc,
            now,
            ownerName: pack.ownerName,
            topic: "calls this week",
            snapshotLines: snapshotLines(pack),
          }),
          actions: defaultActions(pack),
          suggestions: defaultSuggestions(loc),
        };
      }
      return {
        answer: composeAssistantReply({
          locale: loc,
          now,
          ownerName: pack.ownerName,
          facts: {
            headline:
              `Your busiest day this week was ${busiest[0]} with ${busiest[1]} call${busiest[1] === 1 ? "" : "s"}.`,
          },
        }),
        rows: [{ label: busiest[0], value: String(busiest[1]) }],
        actions: defaultActions(pack),
        suggestions: defaultSuggestions(loc),
      };
    }
    case "urgent_calls": {
      const count = pack.calls.filter(isUrgentCall).length;
      return {
        answer: composeCountReply({
          locale: loc,
          now,
          ownerName: pack.ownerName,
          label: "Urgent calls",
          count,
        }),
        rows: [{ label: "Urgent calls", value: String(count) }],
        actions: [{ label: labels(pack).recentCalls, href: "/dashboard/missed-calls" }],
        suggestions: defaultSuggestions(loc),
      };
    }
    case "general":
    default:
      return handleGeneral(pack, query);
  }
}

export function buildProactiveBriefing(pack: AiContextPack): EffiroadAiResponse {
  const loc = pack.locale;
  const s = pack.snapshot;
  const bullets = snapshotLines(pack);
  if (s.pendingCount > 0) {
    bullets.unshift(
      `Needs attention: ${s.pendingCount} pending approval${s.pendingCount === 1 ? "" : "s"}`,
    );
  }
  if (s.urgentCount > 0) {
    bullets.unshift(
      `${s.urgentCount} urgent request${s.urgentCount === 1 ? "" : "s"}`,
    );
  }
  const headline =
    "Here's your shop briefing for today. What would you like to check first?";

  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline, bullets },
    }),
    rows: bullets.map((b) => ({ label: "Summary", value: b })),
    actions: defaultActions(pack),
    suggestions: defaultSuggestions(loc),
  };
}

export { buildAiContextPack };
