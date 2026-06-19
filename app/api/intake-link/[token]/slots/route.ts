import { NextResponse } from "next/server";
import { getLinkIntakeSession, isLinkIntakeSessionExpired } from "@/lib/call-intake/link-intake-store";
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
  const session = await getLinkIntakeSession(token);
  if (!session || isLinkIntakeSessionExpired(session)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const settings = await getShopBookingSettings(session.userId);
  if (!settings.schedulingEnabled) {
    return NextResponse.json({ schedulingEnabled: false, slots: [] });
  }

  const url = new URL(request.url);
  const urgency = parseLinkUrgency(url.searchParams.get("urgency")) ?? "this_week";
  const priority = linkUrgencyToPriority(urgency);

  const slots = await offerVisitSlotsForTenant({
    userId: session.userId,
    priority,
  });

  const grid = await offerSlotGridForTenant({
    userId: session.userId,
    priority,
  });

  return NextResponse.json({
    schedulingEnabled: true,
    slots,
    grid,
    durationMinutes: settings.defaultDurationMinutes,
    bufferMinutes: settings.slotBufferMinutes,
    maxConcurrentVisits: settings.maxConcurrentVisits,
  });
}
