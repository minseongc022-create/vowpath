import { NextResponse } from "next/server";
import {
  ALL_JOB_PRIORITIES,
  DEFAULT_SHOP_BOOKING_SETTINGS,
  coalesceSchedulingSettingsPatch,
  mergeShopBookingSettings,
  type OwnerApprovalSms,
  type SchedulingMode,
  type ShopBookingSettings,
} from "@/lib/booking-settings";
import {
  getShopBookingSettings,
  saveShopBookingSettings,
} from "@/lib/shop-settings-db";
import { getSession } from "@/lib/session";

const MODES: SchedulingMode[] = ["speed", "hybrid", "control"];
const OWNER_SMS: OwnerApprovalSms[] = ["off", "p1_only", "all"];

function patchFromBody(body: Record<string, unknown>): Partial<ShopBookingSettings> {
  const patch: Partial<ShopBookingSettings> = {};

  if (typeof body.schedulingEnabled === "boolean") {
    patch.schedulingEnabled = body.schedulingEnabled;
  }
  if (typeof body.schedulingMode === "string" && MODES.includes(body.schedulingMode as SchedulingMode)) {
    patch.schedulingMode = body.schedulingMode as SchedulingMode;
  }
  if (typeof body.ownerApprovalSms === "string" && OWNER_SMS.includes(body.ownerApprovalSms as OwnerApprovalSms)) {
    patch.ownerApprovalSms = body.ownerApprovalSms as OwnerApprovalSms;
  }
  if (typeof body.undoWindowMinutes === "number" && body.undoWindowMinutes >= 5 && body.undoWindowMinutes <= 120) {
    patch.undoWindowMinutes = Math.round(body.undoWindowMinutes);
  }
  if (typeof body.shadowModeRemaining === "number" && body.shadowModeRemaining >= 0 && body.shadowModeRemaining <= 50) {
    patch.shadowModeRemaining = Math.round(body.shadowModeRemaining);
  }
  if (typeof body.nativeCalendarEnabled === "boolean") {
    patch.nativeCalendarEnabled = body.nativeCalendarEnabled;
  }
  if (typeof body.slotOfferCount === "number" && body.slotOfferCount >= 1 && body.slotOfferCount <= 5) {
    patch.slotOfferCount = Math.round(body.slotOfferCount);
  }
  if (Array.isArray(body.serviceAreaZips)) {
    patch.serviceAreaZips = (body.serviceAreaZips as unknown[])
      .filter((z): z is string => typeof z === "string")
      .map((z) => z.trim().slice(0, 5))
      .filter((z) => /^\d{5}$/.test(z));
  }
  if (Array.isArray(body.hybridAutoPriorities)) {
    patch.hybridAutoPriorities = (body.hybridAutoPriorities as unknown[]).filter(
      (p): p is (typeof ALL_JOB_PRIORITIES)[number] =>
        p === "P1" || p === "P2" || p === "P3",
    );
  }
  return patch;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getShopBookingSettings(session.sub);
    return NextResponse.json({ settings, defaults: DEFAULT_SHOP_BOOKING_SETTINGS });
  } catch (e) {
    console.error("[shop/settings GET]", e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const current = await getShopBookingSettings(session.sub);
    const rawPatch = patchFromBody(body);
    const patch = coalesceSchedulingSettingsPatch(current, rawPatch);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const settings = await saveShopBookingSettings(session.sub, patch);
    return NextResponse.json({ ok: true, settings: mergeShopBookingSettings(settings) });
  } catch (e) {
    console.error("[shop/settings PATCH]", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
