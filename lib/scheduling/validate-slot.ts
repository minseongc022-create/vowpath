import type { JobPriority } from "../types";
import type { SlotOffer } from "../booking-settings";
import { offerSlotGridForTenant } from "./offer-slots";

export type SlotValidationResult =
  | { ok: true; slot: SlotOffer }
  | { ok: false; reason: "unavailable" | "not_found" | "scheduling_disabled" };

/** Re-check that a slot is still open before committing a booking. */
export async function validateSlotAvailable(params: {
  userId: string;
  slot: Pick<SlotOffer, "id" | "startAt" | "endAt" | "source">;
  priority: JobPriority;
  excludeBookingId?: string;
}): Promise<SlotValidationResult> {
  const grid = await offerSlotGridForTenant({
    userId: params.userId,
    priority: params.priority,
    excludeBookingId: params.excludeBookingId,
  });
  if (!grid) {
    return { ok: false, reason: "scheduling_disabled" };
  }

  for (const day of grid.days) {
    const match = day.slots.find(
      (s) =>
        s.status === "available" &&
        (s.id === params.slot.id ||
          (params.slot.startAt && s.startAt === params.slot.startAt)),
    );
    if (match) {
      return {
        ok: true,
        slot: {
          id: match.id,
          label: `${day.weekdayLabel} ${match.label}`,
          startAt: match.startAt,
          endAt: match.endAt,
          source: match.source,
        },
      };
    }
  }

  const known = grid.days.some((day) =>
    day.slots.some((s) => s.id === params.slot.id),
  );
  return { ok: false, reason: known ? "unavailable" : "not_found" };
}

/** Resolve a slot id from the current grid (link / phone intake). */
export async function resolveSlotById(params: {
  userId: string;
  slotId: string;
  priority: JobPriority;
  excludeBookingId?: string;
}): Promise<SlotOffer | null> {
  const result = await validateSlotAvailable({
    userId: params.userId,
    slot: { id: params.slotId, startAt: "", endAt: "", source: "native" },
    priority: params.priority,
    excludeBookingId: params.excludeBookingId,
  });
  return result.ok ? result.slot : null;
}
