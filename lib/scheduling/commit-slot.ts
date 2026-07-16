import type { JobPriority } from "../types";
import type { SlotOffer } from "../booking-settings";
import { withDistributedLock } from "../distributed-lock";
import { upsertScheduledBooking } from "../schedule-bookings-db";
import { validateSlotAvailable } from "./validate-slot";
import { pickFreeTechForWindow, listActiveCrew } from "./tech-lanes";
import { loadSchedulingContext } from "./offer-slots";
import { getShopBookingSettings } from "../shop-settings-db";
import { getTechDispatchSettings } from "../tech-dispatch/store";
import { orderPoolWithOnCall } from "../tech-dispatch/on-call";
import { getShopProfile } from "../shop-profile-db";
import { resolveShopTimezone } from "../shop-timezone";
import { getJobberTokens } from "../jobber-tokens";

export type CommitSlotResult =
  | {
      ok: true;
      slot: SlotOffer;
      assignedTechId: string | null;
      assignedTechName: string | null;
    }
  | { ok: false; reason: "unavailable" | "not_found" | "scheduling_disabled" | "no_crew" };

async function resolveAutoTech(params: {
  userId: string;
  slot: SlotOffer;
  priority: JobPriority;
  excludeBookingId?: string;
}): Promise<{ id: string; name: string } | null> {
  const dispatch = await getTechDispatchSettings(params.userId);
  if (!dispatch.enabled) return null;

  const settings = await getShopBookingSettings(params.userId);
  const bufferMs = Math.max(0, settings.slotBufferMinutes) * 60_000;
  const startMs = new Date(params.slot.startAt).getTime();
  const endMs = new Date(params.slot.endAt).getTime();

  const tokens = await getJobberTokens(params.userId);
  const source =
    tokens && settings.jobberSchedulingEnabled ? ("jobber" as const) : ("native" as const);
  const ctx = await loadSchedulingContext(
    params.userId,
    source,
    params.excludeBookingId,
  );

  let crew = await listActiveCrew(params.userId);
  if (dispatch.p1SeniorOnly && params.priority === "P1") {
    const seniors = crew.filter((t) => t.senior);
    if (seniors.length > 0) crew = seniors;
  }
  if (!crew.length) return null;

  const profile = await getShopProfile(params.userId);
  const timeZone = resolveShopTimezone(profile);
  const ordered = orderPoolWithOnCall(dispatch, crew, timeZone);

  const picked = pickFreeTechForWindow({
    techs: ordered,
    startMs,
    endMs,
    bufferMs,
    laneBookings: ctx.laneBookings,
    preferredTechId: ordered[0]?.id,
  });

  return picked ? { id: picked.id, name: picked.name.trim() || picked.phone } : null;
}

/** Validate, lock, reserve lane, and optionally pre-assign crew — no double-booking. */
export async function commitSlotBooking(params: {
  userId: string;
  bookingId: string;
  slot: Pick<SlotOffer, "id" | "startAt" | "endAt" | "source" | "label">;
  priority: JobPriority;
  excludeBookingId?: string;
  manualTechId?: string | null;
  skipAutoAssign?: boolean;
}): Promise<CommitSlotResult> {
  const lockKey = `slot-commit:${params.userId}:${params.slot.startAt}`;

  return withDistributedLock(lockKey, async () => {
    const check = await validateSlotAvailable({
      userId: params.userId,
      slot: params.slot,
      priority: params.priority,
      excludeBookingId: params.excludeBookingId ?? params.bookingId,
    });

    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }

    let assignedTechId: string | null = null;
    let assignedTechName: string | null = null;

    if (params.manualTechId) {
      const crew = await listActiveCrew(params.userId);
      const tech = crew.find((t) => t.id === params.manualTechId);
      if (!tech) {
        return { ok: false, reason: "no_crew" };
      }
      assignedTechId = tech.id;
      assignedTechName = tech.name.trim() || tech.phone;
    } else if (!params.skipAutoAssign) {
      const auto = await resolveAutoTech({
        userId: params.userId,
        slot: check.slot,
        priority: params.priority,
        excludeBookingId: params.excludeBookingId ?? params.bookingId,
      });
      if (auto) {
        assignedTechId = auto.id;
        assignedTechName = auto.name;
      }
    }

    await upsertScheduledBooking(params.userId, {
      bookingId: params.bookingId,
      scheduledStartAt: check.slot.startAt,
      scheduledEndAt: check.slot.endAt,
      arrivalWindowLabel: check.slot.label,
      slotSource: check.slot.source,
      assignedTechId: assignedTechId ?? undefined,
      assignedTechName: assignedTechName ?? undefined,
    });

    return {
      ok: true,
      slot: check.slot,
      assignedTechId,
      assignedTechName,
    };
  });
}
