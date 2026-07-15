import { NextResponse } from "next/server";
import { analyzeAiAdminIntent, shouldRunAdminAnalyzer } from "@/lib/ai-admin/analyze";
import { analyzeWorkflowIntentAsync } from "@/lib/ai-admin/workflow-parse";
import { analyzeClosureIntentAsync } from "@/lib/ai-admin/closure-intent";
import { answerAiQuestion, buildProactiveBriefing } from "@/lib/ai-admin/answer";
import { buildAiContextPack } from "@/lib/ai-admin/context-pack";
import { routeAiQuery } from "@/lib/ai-admin/router";
import { fetchNextBillingDate, mergeUserBilling } from "@/lib/billing";
import { getBookingRequestStatuses } from "@/lib/booking-status";
import { buildCalendarEvents } from "@/lib/calendar-events-server";
import { listCallMemory } from "@/lib/call-memory";
import { listCallLogs } from "@/lib/call-logs";
import { getCompanyAiMemory } from "@/lib/company-ai-memory";
import { listCustomerVerifications } from "@/lib/customer-verification/store";
import { parseDateInput, toDateInputValue } from "@/lib/dashboard-analytics";
import { listJobs } from "@/lib/jobs-db";
import { fetchJobberRequestsInRange } from "@/lib/jobber-api";
import { getJobberTokens } from "@/lib/jobber-tokens";
import { resolveServerUiLocale, shopAiLocale } from "@/lib/locale";
import { listScheduledBookings } from "@/lib/schedule-bookings-db";
import { fetchJobberScheduleItems } from "@/lib/scheduling/jobber-schedule-api";
import { getSession } from "@/lib/session";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { getShopProfile } from "@/lib/shop-profile-db";
import { findUserById } from "@/lib/users-db";
import { listWorkflowRules } from "@/lib/workflow-rules/store";
import { buildWorkflowSuggestion } from "@/lib/ai-admin/workflow-suggestions";
import {
  parseChatHistory,
  resolveConversationFollowUp,
} from "@/lib/ai-admin/conversation-followup";

export const maxDuration = 25;

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function calendarRange(now: Date) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(to.getDate() + 14);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function loadTenantContext(userId: string, range: { start: Date; end: Date }, now: Date) {
  const cal = calendarRange(now);
  const [
    calls,
    jobs,
    requestStatuses,
    customerVerifications,
    tokens,
    callMemory,
    companyMemory,
    bookingSettings,
    shopProfile,
    user,
    nativeSchedule,
    jobberSchedule,
    workflowRules,
  ] = await Promise.all([
    listCallLogs(userId, {
      start: toDateInputValue(range.start),
      end: toDateInputValue(range.end),
    }),
    listJobs(userId, {
      start: toDateInputValue(range.start),
      end: toDateInputValue(range.end),
    }),
    getBookingRequestStatuses(userId),
    listCustomerVerifications(userId).catch(() => []),
    getJobberTokens(userId),
    listCallMemory(userId).catch(() => []),
    getCompanyAiMemory(userId),
    getShopBookingSettings(userId),
    getShopProfile(userId),
    findUserById(userId),
    listScheduledBookings(userId, cal.from, cal.to),
    fetchJobberScheduleItems(userId, cal.from, cal.to).catch(() => []),
    listWorkflowRules(userId),
  ]);

  if (!user) return null;

  const jobberBookings = tokens
    ? await fetchJobberRequestsInRange(userId, range.start, range.end).catch(() => [])
    : [];

  const calendarEvents = await buildCalendarEvents(userId, nativeSchedule, jobberSchedule);

  const billing = mergeUserBilling(user);
  const nextBillingDate = await fetchNextBillingDate(billing.paddleCustomerId);

  const pack = buildAiContextPack({
    userId,
    user,
    calls,
    jobs,
    jobberBookings,
    requestStatuses,
    customerVerifications,
    callMemory,
    companyMemory,
    bookingSettings,
    shopProfile,
    calendarEvents,
    jobberConnected: Boolean(tokens),
    nextBillingDate,
    now,
    workflowRules,
  });

  return { pack, tokens: Boolean(tokens) };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const proactive = Boolean(body?.proactive);
    const query = String(body?.query ?? body?.question ?? "").trim();
    const history = parseChatHistory(body?.history);

    if (!proactive && !query) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const startParam = typeof body?.start === "string" ? body.start : null;
    const endParam = typeof body?.end === "string" ? body.end : null;
    let { start, end } = defaultRange();
    if (startParam && endParam) {
      const parsedStart = parseDateInput(startParam);
      const parsedEnd = parseDateInput(endParam);
      if (parsedStart && parsedEnd && parsedStart <= parsedEnd) {
        start = parsedStart;
        end = parsedEnd;
        end.setHours(23, 59, 59, 999);
      }
    }

    const now = new Date();
    const loaded = await loadTenantContext(session.sub, { start, end }, now);
    if (!loaded) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { pack } = loaded;
    const locale = shopAiLocale(await resolveServerUiLocale());

    if (proactive) {
      const response = buildProactiveBriefing(pack);
      const suggestion = await buildWorkflowSuggestion(pack);
      if (suggestion?.kind === "preview") {
        return NextResponse.json({
          ok: true,
          ...response,
          adminPreview: suggestion.preview,
          suggestions: suggestion.suggestions ?? response.suggestions,
          response: {
            ...response,
            adminPreview: suggestion.preview,
            suggestions: suggestion.suggestions ?? response.suggestions,
          },
        });
      }
      return NextResponse.json({ ok: true, ...response, response });
    }

    if (shouldRunAdminAnalyzer(query) || history.length > 0) {
      const followUp = resolveConversationFollowUp({
        query,
        history,
        workflowRules: pack.workflowRules,
        locale,
      });
      if (followUp?.kind === "preview") {
        const response = {
          answer: followUp.answer,
          adminPreview: followUp.preview,
          actions: [],
          suggestions: followUp.suggestions,
        };
        return NextResponse.json({ ok: true, ...response, response });
      }
    }

    if (shouldRunAdminAnalyzer(query)) {
      const [workflow, closure] = await Promise.all([
        analyzeWorkflowIntentAsync(query, locale),
        analyzeClosureIntentAsync(query, locale),
      ]);

      if (workflow?.kind === "preview") {
        const response = {
          answer: workflow.answer,
          adminPreview: workflow.preview,
          actions: [],
          suggestions: workflow.suggestions,
        };
        return NextResponse.json({ ok: true, ...response, response });
      }

      if (closure?.kind === "preview") {
        const response = {
          answer: closure.answer,
          adminPreview: closure.preview,
          actions: [],
          suggestions: closure.suggestions,
        };
        return NextResponse.json({ ok: true, ...response, response });
      }

      const admin = analyzeAiAdminIntent(query, {
        companyMemory: pack.companyMemory,
        bookingSettings: pack.bookingSettings,
        shopProfile: pack.shopProfile,
        user: pack.user,
        nextBillingDate: pack.billing.nextBillingDate,
        locale,
      });

      if (admin.kind === "preview") {
        const response = {
          answer: admin.answer,
          adminPreview: admin.preview,
          actions: [],
          suggestions: admin.suggestions,
        };
        return NextResponse.json({ ok: true, ...response, response });
      }

      if (admin.kind === "billing") {
        const response = {
          answer: admin.answer,
          billingCard: admin.billingCard,
          actions: [],
          suggestions: admin.suggestions,
        };
        return NextResponse.json({ ok: true, ...response, response });
      }

      if (admin.kind === "blocked") {
        const response = {
          answer: admin.answer,
          rows: admin.rows,
          actions: [{ label: locale === "ko" ? "결제 포털" : "Billing portal", href: "/api/billing/portal" }],
          suggestions: admin.suggestions,
        };
        return NextResponse.json({ ok: true, ...response, response });
      }
    }

    const intent = routeAiQuery(query);
    const response = answerAiQuestion(query, pack, intent);
    return NextResponse.json({ ok: true, ...response, response });
  } catch (e) {
    console.error("[effiroad-ai]", e);
    return NextResponse.json({ error: "AI query failed" }, { status: 500 });
  }
}
