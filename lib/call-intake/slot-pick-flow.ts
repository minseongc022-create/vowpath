import type { SlotOffer } from "../booking-settings";
import { getShopBookingSettings } from "../shop-settings-db";
import { offerVisitSlotsForTenant } from "../scheduling/offer-slots";
import type { CallIntakeState } from "./types";

export function slotPickPrompt(slots: SlotOffer[]): string {
  const lines = slots.map((s, i) => `Press ${i + 1} for ${s.label}.`);
  return (
    "We have these visit windows available. " +
    lines.join(" ") +
    " Press the number for your preferred time."
  );
}

export function parseSlotDigit(
  digit: string | null,
  slotCount: number,
): number | null {
  if (!digit) return null;
  const n = Number(digit);
  if (!Number.isInteger(n) || n < 1 || n > slotCount) return null;
  return n - 1;
}

export async function prepareSlotPickPhase(
  state: CallIntakeState,
): Promise<CallIntakeState> {
  const settings = await getShopBookingSettings(state.userId);
  if (!settings.schedulingEnabled) {
    return { ...state, phase: "final", offeredSlots: [], selectedSlot: null };
  }

  const priority = state.menuPriority ?? state.draft.priority ?? "P2";
  const slots = await offerVisitSlotsForTenant({
    userId: state.userId,
    priority,
  });

  if (slots.length === 0) {
    return {
      ...state,
      phase: "final",
      offeredSlots: [],
      selectedSlot: null,
      draft: { ...state.draft, arrivalWindow: "Pending — no open slot" },
    };
  }

  return {
    ...state,
    phase: "slot_pick",
    offeredSlots: slots,
    selectedSlot: null,
  };
}

export function applySlotSelection(
  state: CallIntakeState,
  index: number,
): CallIntakeState {
  const slot = state.offeredSlots?.[index];
  if (!slot) return state;
  return {
    ...state,
    phase: "final",
    selectedSlot: slot,
    draft: { ...state.draft, arrivalWindow: slot.label },
  };
}
