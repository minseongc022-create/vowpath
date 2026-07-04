import { NextResponse } from "next/server";
import {
  getShopProfile,
  mergeShopProfile,
  saveShopProfile,
  type ShopProfile,
} from "@/lib/shop-profile-db";
import { getSession } from "@/lib/session";
import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "@/lib/forwarding-guides";
import type { BookingMode } from "@/lib/booking-policy";
import type { AnswerWindow } from "@/lib/types";
import { normalizeShopVertical, ALL_SHOP_VERTICALS, type ShopVertical } from "@/lib/shop-vertical";
import { TREND_CHART_SERIES, type TrendChartSeriesId } from "@/lib/trend-chart-series";

const SCENARIOS = new Set<ForwardingScenarioId>([
  "overflow",
  "busy_and_after_hours",
]);
const PROVIDERS = new Set<ForwardingProviderId>([
  "dialpad",
  "voip",
  "carrier",
  "other",
]);
const DASHBOARD_METRIC_IDS = new Set<TrendChartSeriesId>(
  TREND_CHART_SERIES.map((s) => s.id),
);

function patchFromBody(body: Record<string, unknown>): Partial<ShopProfile> {
  const patch: Partial<ShopProfile> = {};

  if (Array.isArray(body.scheduleWindows)) {
    patch.scheduleWindows = body.scheduleWindows as AnswerWindow[];
  }
  if (typeof body.answerScheduleActive === "boolean") {
    patch.answerScheduleActive = body.answerScheduleActive;
  }
  if (typeof body.scheduleAlwaysOn === "boolean") {
    patch.scheduleAlwaysOn = body.scheduleAlwaysOn;
  }
  if (typeof body.jobberConnected === "boolean") {
    patch.jobberConnected = body.jobberConnected;
  }
  if (typeof body.jobberSetupConfirmed === "boolean") {
    patch.jobberSetupConfirmed = body.jobberSetupConfirmed;
  }
  if (typeof body.jobberSkipped === "boolean") {
    patch.jobberSkipped = body.jobberSkipped;
  }
  if (typeof body.forwardingDone === "boolean") {
    patch.forwardingDone = body.forwardingDone;
  }
  if (typeof body.onboardingComplete === "boolean") {
    patch.onboardingComplete = body.onboardingComplete;
  }
  if (
    typeof body.forwardingScenario === "string" &&
    SCENARIOS.has(body.forwardingScenario as ForwardingScenarioId)
  ) {
    patch.forwardingScenario = body.forwardingScenario as ForwardingScenarioId;
  }
  if (
    typeof body.forwardingProvider === "string" &&
    PROVIDERS.has(body.forwardingProvider as ForwardingProviderId)
  ) {
    patch.forwardingProvider = body.forwardingProvider as ForwardingProviderId;
  }
  if (
    typeof body.bookingMode === "string" &&
    (body.bookingMode === "request_only" || body.bookingMode === "auto_booking")
  ) {
    patch.bookingMode = body.bookingMode as BookingMode;
  }
  if (
    typeof body.vertical === "string" &&
    ALL_SHOP_VERTICALS.includes(body.vertical as ShopVertical)
  ) {
    patch.vertical = normalizeShopVertical(body.vertical);
  }
  if (
    Array.isArray(body.dashboardVisibleMetrics) &&
    body.dashboardVisibleMetrics.every(
      (id): id is TrendChartSeriesId =>
        typeof id === "string" && DASHBOARD_METRIC_IDS.has(id as TrendChartSeriesId),
    )
  ) {
    patch.dashboardVisibleMetrics = body.dashboardVisibleMetrics as TrendChartSeriesId[];
  }
  if (typeof body.googleReviewUrl === "string") {
    const url = body.googleReviewUrl.trim();
    if (url === "") {
      patch.googleReviewUrl = undefined;
    } else if (/^https:\/\/.{1,300}$/.test(url)) {
      patch.googleReviewUrl = url;
    }
  }
  if (typeof body.zapierWebhookUrl === "string") {
    const url = body.zapierWebhookUrl.trim();
    if (url === "") {
      patch.zapierWebhookUrl = undefined;
    } else if (/^https:\/\/hooks\.zapier\.com\/.{1,300}$/.test(url)) {
      patch.zapierWebhookUrl = url;
    }
  }

  return patch;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getShopProfile(session.sub);
    return NextResponse.json({ profile: mergeShopProfile(profile) });
  } catch (e) {
    console.error("[shop/profile GET]", e);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch = patchFromBody(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }
    const profile = await saveShopProfile(session.sub, patch);
    return NextResponse.json({ ok: true, profile });
  } catch (e) {
    console.error("[shop/profile PATCH]", e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
