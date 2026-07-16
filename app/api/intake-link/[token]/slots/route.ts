import { NextResponse } from "next/server";
import { requireLinkIntakeSession } from "@/lib/call-intake/link-intake-route-guard";
import { offerVisitSlotsForTenant, offerSlotGridForTenant } from "@/lib/scheduling/offer-slots";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { linkUrgencyToPriority, parseLinkUrgency } from "@/lib/link-intake-urgency";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const guard = await guardPublicIntakeRoute(request, token);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const sessionGuard = await requireLinkIntakeSession(token);
  if (!sessionGuard.ok) {
    return NextResponse.json(
      { error: sessionGuard.error, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }
  const session = sessionGuard.session;

  const settings = await getShopBookingSettings(session.userId);
  if (!settings.schedulingEnabled) {
    return NextResponse.json({ schedulingEnabled: false, slots: [] });
  }

  const url = new URL(request.url);
  const urgency = parseLinkUrgency(url.searchParams.get("urgency")) ?? "this_week";
  const priority = linkUrgencyToPriority(urgency);
  const excludeBookingId = url.searchParams.get("excludeBookingId")?.trim() || undefined;

  const slots = await offerVisitSlotsForTenant({
    userId: session.userId,
    priority,
    excludeBookingId,
  });

  const grid = await offerSlotGridForTenant({
    userId: session.userId,
    priority,
    excludeBookingId,
  });

  return NextResponse.json({
    schedulingEnabled: true,
    slots,
    grid,
    durationMinutes: settings.defaultDurationMinutes,
    bufferMinutes: settings.slotBufferMinutes,
    maxConcurrentVisits: grid?.maxConcurrentVisits ?? settings.maxConcurrentVisits,
    jobberScheduleUncertain: grid?.jobberScheduleUncertain ?? false,
  });
}
