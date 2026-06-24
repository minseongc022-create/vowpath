import {
  isApprovedBooking,
  isPendingShopReview,
  REQUEST_STATUS_LABELS,
} from "../booking-policy";
import { buildDailyBriefing } from "../dashboard-briefing";
import { isNoCoolingText } from "../urgent-requests";
import type { VowroadAiAction, VowroadAiResponse } from "../vowroad-ai-query";
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

function defaultActions(pack: AiContextPack): VowroadAiAction[] {
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
    subtitle: `${booking.issueType} · ${booking.arrivalWindow ?? (pack.locale === "ko" ? "시간 미정" : "No requested time")}`,
    href: `/dashboard/bookings/${encodeURIComponent(booking.id)}`,
    status: REQUEST_STATUS_LABELS[status],
  };
}

function actionsForBooking(pack: AiContextPack, booking: RecentBooking | null): VowroadAiAction[] {
  const L = labels(pack);
  const base = defaultActions(pack);
  if (!booking) return base;
  const status = bookingStatusOf(pack, booking);
  const actions: VowroadAiAction[] = [
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
): VowroadAiResponse {
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
        label: pack.locale === "ko" ? "상태" : "Status",
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

function handleCustomer(pack: AiContextPack, name: string): VowroadAiResponse {
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
        pack.locale === "ko"
          ? `"${name}"과(와) 정확히 일치하는 고객은 없지만, 비슷한 이름 ${similar.length}건을 찾았습니다.`
          : `I couldn't find an exact match for "${name}", but I found ${similar.length} similar customer record${similar.length === 1 ? "" : "s"}.`,
        similar,
        true,
      );
    }
    return {
      answer: composeEmptyResult({
        locale: pack.locale,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: pack.locale === "ko" ? `"${name}" 고객` : `customer "${name}"`,
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
    pack.locale === "ko"
      ? `${displayName} 고객을 찾았습니다.`
      : `I found ${displayName}.`;
  const bullets = [
    pack.locale === "ko"
      ? `최근 문의: ${issue} — 상태: ${status}`
      : `Latest request: ${issue} — status: ${status}`,
    pack.locale === "ko"
      ? `최근 통화 ${calls.length}건 · 요청 ${bookings.length}건`
      : `${calls.length} recent call${calls.length === 1 ? "" : "s"} · ${bookings.length} request${bookings.length === 1 ? "" : "s"}`,
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
          label: pack.locale === "ko" ? "연락처" : "Phone",
          value: latestCall?.callbackPhone ?? latestCall?.from ?? "—",
        },
        {
          label: pack.locale === "ko" ? "주소" : "Address",
          value: latestBooking?.address ?? latestCall?.address ?? "—",
        },
        { label: pack.locale === "ko" ? "상태" : "Status", value: status },
        { label: pack.locale === "ko" ? "요청 내용" : "Service", value: issue },
      ],
    },
    items: bookings.slice(0, 5).map((b) => bookingItem(pack, b)),
    actions: actionsForBooking(pack, latestBooking),
    suggestions:
      pack.locale === "ko"
        ? [`${displayName} 통화 기록`, "승인 대기 보여줘", "긴급 요청 보여줘"]
        : [`${displayName} call history`, "Show pending approvals", "Show urgent requests"],
  };
}

function handleCallMemory(pack: AiContextPack): VowroadAiResponse {
  const memory = pack.callMemory;
  if (memory.length === 0) {
    return {
      answer: composeEmptyResult({
        locale: pack.locale,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: pack.locale === "ko" ? "통화 메모" : "call memory",
        snapshotLines: snapshotLines(pack),
      }),
      actions: defaultActions(pack),
      suggestions: defaultSuggestions(pack.locale),
    };
  }
  const selected = memory[0];
  const headline =
    pack.locale === "ko"
      ? `최근 고객 ${selected.customerName}님의 통화 요약입니다.`
      : `Here's the latest call summary for ${selected.customerName}.`;
  const bullets = [
    pack.locale === "ko"
      ? `문의: ${selected.issue}`
      : `Issue: ${selected.issue}`,
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
      { label: pack.locale === "ko" ? "고객" : "Customer", value: selected.customerName },
      { label: pack.locale === "ko" ? "연락처" : "Phone", value: selected.phoneNumber || "—" },
      { label: pack.locale === "ko" ? "상태" : "Status", value: REQUEST_STATUS_LABELS[selected.bookingStatus] },
      { label: pack.locale === "ko" ? "요약" : "Summary", value: selected.summary },
    ],
    actions: actionsForBooking(
      pack,
      pack.bookings.find((b) => b.id === selected.bookingId) ?? null,
    ),
    suggestions: defaultSuggestions(pack.locale),
  };
}

function handlePolicy(pack: AiContextPack): VowroadAiResponse {
  const m = pack.companyMemory;
  const loc = pack.locale;
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline: loc === "ko" ? "저장된 회사 정책입니다." : "Here is your saved company policy.",
      },
    }),
    rows: [
      { label: loc === "ko" ? "서비스 지역" : "Service Areas", value: m.serviceAreas || (loc === "ko" ? "미설정" : "Not saved") },
      { label: loc === "ko" ? "영업 시간" : "Business Hours", value: m.businessHours || (loc === "ko" ? "미설정" : "Not saved") },
      { label: loc === "ko" ? "휴일 규칙" : "Holiday Rules", value: m.holidayRules || (loc === "ko" ? "미설정" : "Not saved") },
      { label: loc === "ko" ? "긴급 정책" : "Emergency Policy", value: m.emergencyPolicy || (loc === "ko" ? "미설정" : "Not saved") },
      { label: loc === "ko" ? "승인 정책" : "Approval Policy", value: m.approvalPolicy || (loc === "ko" ? "미설정" : "Not saved") },
    ],
    actions: [
      { label: labels(pack).editMemory, href: "/dashboard/settings" },
      { label: labels(pack).openSettings, href: "/dashboard/settings" },
    ],
    suggestions: defaultSuggestions(loc),
  };
}

function handleSettingsRead(pack: AiContextPack): VowroadAiResponse {
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
        headline: loc === "ko" ? "현재 샵 설정입니다." : "Here are your current shop settings.",
        bullets: [
          loc === "ko" ? `예약 정책: ${mode}` : `Booking policy: ${mode}`,
          loc === "ko"
            ? `아침 SMS 브리핑: ${m.dailyBriefingSmsEnabled ? "켜짐" : "꺼짐"} (${m.dailyBriefingSmsTime})`
            : `Morning SMS briefing: ${m.dailyBriefingSmsEnabled ? "On" : "Off"} (${m.dailyBriefingSmsTime})`,
          loc === "ko"
            ? `AI 전화 응답: ${pack.shopProfile.answerScheduleActive ? "활성" : "비활성"}`
            : `AI phone answering: ${pack.shopProfile.answerScheduleActive ? "Active" : "Inactive"}`,
        ],
      },
    }),
    rows: [
      { label: loc === "ko" ? "예약 정책" : "Booking policy", value: mode },
      { label: loc === "ko" ? "승인 SMS" : "Approval SMS", value: s.ownerApprovalSms },
      { label: loc === "ko" ? "아침 브리핑" : "Morning Briefing", value: m.dailyBriefingSmsEnabled ? "On" : "Off" },
      { label: loc === "ko" ? "브리핑 시간" : "Briefing Time", value: m.dailyBriefingSmsTime },
    ],
    actions: [{ label: labels(pack).openSettings, href: "/dashboard/settings" }],
    suggestions:
      loc === "ko"
        ? ["주말은 수동 승인 규칙 만들어줘", "아침 SMS 꺼줘", "서비스 지역 보여줘"]
        : ["Add a weekend manual-approval rule", "Turn off morning SMS", "Show service areas"],
  };
}

function handleAutomationRules(pack: AiContextPack): VowroadAiResponse {
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
            loc === "ko"
              ? "저장된 운영 규칙이 없습니다. 자연어로 규칙을 만들 수 있습니다."
              : "You don't have any automation rules yet. You can create one in plain language.",
          bullets:
            loc === "ko"
              ? ['예: "No Cooling은 자동 승인해줘"', '"주말 예약은 승인 필요"']
              : ['Try: "Auto approve No Cooling"', '"Weekend bookings need approval"'],
        },
      }),
      actions: [
        { label: loc === "ko" ? "설정 열기" : "Open Settings", href: "/dashboard/settings" },
        { label: loc === "ko" ? "Vowroad AI" : "Vowroad AI", href: "/dashboard/ai" },
      ],
      suggestions:
        loc === "ko"
          ? ["No Cooling은 자동 승인해줘", "Gas Smell은 무조건 긴급 처리"]
          : ["Auto approve No Cooling", "Gas smell is always urgent"],
    };
  }

  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: {
        headline:
          loc === "ko"
            ? `활성 운영 규칙 ${rules.filter((r) => r.enabled).length}건 / 전체 ${rules.length}건`
            : `${rules.filter((r) => r.enabled).length} active automation rule${rules.length === 1 ? "" : "s"} (${rules.length} total)`,
        bullets: rules.slice(0, 6).map((r) => summarizeWorkflowRule(r, loc)),
      },
    }),
    items: rules.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: summarizeWorkflowRule(r, loc),
      status: r.enabled ? (loc === "ko" ? "활성" : "Active") : loc === "ko" ? "비활성" : "Inactive",
    })),
    actions: [{ label: loc === "ko" ? "설정에서 관리" : "Manage in Settings", href: "/dashboard/settings" }],
    suggestions:
      loc === "ko"
        ? ["No Cooling은 자동 승인해줘", "주말 예약은 승인 필요"]
        : ["Auto approve No Cooling", "Weekend bookings need approval"],
  };
}

function handleIntegration(pack: AiContextPack): VowroadAiResponse {
  const loc = pack.locale;
  const live = pack.snapshot.integrationLive;
  const headline = live
    ? loc === "ko"
      ? "샵이 라이브 상태입니다. Vowroad가 설정한 시간에 전화를 받을 수 있습니다."
      : "Your shop is live — Vowroad can answer calls on your configured schedule."
    : loc === "ko"
      ? "아직 연동 설정이 완료되지 않았습니다. 연락처·시간대·착신 전환을 마무리해 주세요."
      : "Setup isn't complete yet. Finish contact, schedule, and call forwarding to go live.";
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline },
    }),
    rows: [
      { label: loc === "ko" ? "라이브" : "Live", value: live ? (loc === "ko" ? "예" : "Yes") : (loc === "ko" ? "아니오" : "No") },
      { label: "Jobber", value: pack.snapshot.jobberConnected ? (loc === "ko" ? "연결됨" : "Connected") : (loc === "ko" ? "미연결" : "Not connected") },
      { label: loc === "ko" ? "AI 수신" : "AI answering", value: pack.shopProfile.answerScheduleActive ? (loc === "ko" ? "켜짐" : "On") : (loc === "ko" ? "꺼짐" : "Off") },
    ],
    actions: [{ label: labels(pack).openSettings, href: "/dashboard/settings" }],
    suggestions: defaultSuggestions(loc),
  };
}

function handleCalendarToday(pack: AiContextPack): VowroadAiResponse {
  const events = pack.calendarEvents.filter((e) => eventOnDay(e, pack.now));
  const loc = pack.locale;
  const headline =
    loc === "ko"
      ? `오늘 방문 예정은 ${events.length}건입니다.`
      : `You have ${events.length} visit${events.length === 1 ? "" : "s"} scheduled today.`;
  if (events.length === 0) {
    return {
      answer: composeEmptyResult({
        locale: loc,
        now: pack.now,
        ownerName: pack.ownerName,
        topic: loc === "ko" ? "오늘 일정" : "today's schedule",
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

function handleGeneral(pack: AiContextPack, query: string): VowroadAiResponse {
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
            loc === "ko"
              ? `통화 기록에서 ${ragHits.length}건을 찾았습니다.`
              : `I found ${ragHits.length} related call${ragHits.length === 1 ? "" : "s"} in your records.`,
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
    loc === "ko"
      ? "지금 샵 운영 스냅샷입니다."
      : "Here's a quick snapshot of your shop right now.";
  const bullets = snapshotLines(pack);
  if (s.pendingCount > 0) {
    bullets.push(
      loc === "ko"
        ? `승인 대기 ${s.pendingCount}건이 먼저 확인이 필요합니다.`
        : `${s.pendingCount} request${s.pendingCount === 1 ? "" : "s"} need your approval.`,
    );
  }
  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline, bullets },
    }),
    rows: bullets.map((b) => ({ label: loc === "ko" ? "요약" : "Summary", value: b })),
    actions: defaultActions(pack),
    suggestions: defaultSuggestions(loc),
  };
}

export function answerAiQuestion(query: string, pack: AiContextPack, intent: AiQueryIntent): VowroadAiResponse {
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
              loc === "ko"
                ? `이번 주 일정은 ${events.length}건입니다.`
                : `You have ${events.length} scheduled event${events.length === 1 ? "" : "s"} this week.`,
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
          label: loc === "ko" ? "오늘 통화" : "Calls today",
          count: pack.snapshot.callsToday,
        }),
        rows: [{ label: loc === "ko" ? "오늘 통화" : "Calls today", value: String(pack.snapshot.callsToday) }],
        actions: [{ label: labels(pack).recentCalls, href: "/dashboard/missed-calls" }],
        suggestions: defaultSuggestions(loc),
      };
    case "pending_approvals": {
      const pending = pack.bookings.filter((b) => isPendingShopReview(bookingStatusOf(pack, b)));
      return listResponse(
        pack,
        loc === "ko"
          ? `승인 대기 요청은 ${pending.length}건입니다.`
          : `You have ${pending.length} pending approval${pending.length === 1 ? "" : "s"}.`,
        pending,
      );
    }
    case "urgent_requests": {
      const urgent = pack.bookings.filter(isUrgentBooking);
      return listResponse(
        pack,
        loc === "ko"
          ? `긴급 요청은 ${urgent.length}건입니다.`
          : `You have ${urgent.length} urgent request${urgent.length === 1 ? "" : "s"}.`,
        urgent,
      );
    }
    case "bookings_week": {
      const weekBookings = pack.bookings.filter(
        (b) => inRange(b.createdAt, week.start, week.end) && isApprovedBooking(bookingStatusOf(pack, b)),
      );
      return listResponse(
        pack,
        loc === "ko"
          ? `이번 주 확정 예약은 ${weekBookings.length}건입니다.`
          : `You have ${weekBookings.length} confirmed booking${weekBookings.length === 1 ? "" : "s"} this week.`,
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
          label: loc === "ko" ? "근무 외 통화" : "After-hours calls",
          count: afterHours.length,
        }),
        rows: [{ label: loc === "ko" ? "근무 외 통화" : "After-hours calls", value: String(afterHours.length) }],
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
        loc === "ko"
          ? `냉방 불량(No Cooling) 요청 ${noCooling.length}건입니다.`
          : `Found ${noCooling.length} no-cooling request${noCooling.length === 1 ? "" : "s"}.`,
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
            topic: loc === "ko" ? "어제 활동" : "yesterday's activity",
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
            headline: loc === "ko" ? "어제 샵 활동 요약입니다." : "Here's what happened yesterday.",
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
        const key = new Date(call.createdAt).toLocaleDateString(loc === "ko" ? "ko-KR" : "en-US", {
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
            topic: loc === "ko" ? "이번 주 통화" : "calls this week",
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
              loc === "ko"
                ? `이번 주 가장 바쁜 날은 ${busiest[0]} (${busiest[1]}통화)입니다.`
                : `Your busiest day this week was ${busiest[0]} with ${busiest[1]} call${busiest[1] === 1 ? "" : "s"}.`,
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
          label: loc === "ko" ? "긴급 통화" : "Urgent calls",
          count,
        }),
        rows: [{ label: loc === "ko" ? "긴급 통화" : "Urgent calls", value: String(count) }],
        actions: [{ label: labels(pack).recentCalls, href: "/dashboard/missed-calls" }],
        suggestions: defaultSuggestions(loc),
      };
    }
    case "general":
    default:
      return handleGeneral(pack, query);
  }
}

export function buildProactiveBriefing(pack: AiContextPack): VowroadAiResponse {
  const loc = pack.locale;
  const s = pack.snapshot;
  const bullets = snapshotLines(pack);
  if (s.pendingCount > 0) {
    bullets.unshift(
      loc === "ko"
        ? `먼저 확인: 승인 대기 ${s.pendingCount}건`
        : `Needs attention: ${s.pendingCount} pending approval${s.pendingCount === 1 ? "" : "s"}`,
    );
  }
  if (s.urgentCount > 0) {
    bullets.unshift(
      loc === "ko"
        ? `긴급 요청 ${s.urgentCount}건`
        : `${s.urgentCount} urgent request${s.urgentCount === 1 ? "" : "s"}`,
    );
  }
  const headline =
    loc === "ko"
      ? "오늘 샵 운영 브리핑입니다. 무엇을 먼저 확인할까요?"
      : "Here's your shop briefing for today. What would you like to check first?";

  return {
    answer: composeAssistantReply({
      locale: loc,
      now: pack.now,
      ownerName: pack.ownerName,
      facts: { headline, bullets },
    }),
    rows: bullets.map((b) => ({ label: loc === "ko" ? "요약" : "Summary", value: b })),
    actions: defaultActions(pack),
    suggestions: defaultSuggestions(loc),
  };
}

export { buildAiContextPack };
