import type { SlotOffer } from "../booking-settings";
import { getShopBookingSettings } from "../shop-settings-db";
import { offerVisitSlotsForTenant } from "../scheduling/offer-slots";
import { validateSlotAvailable } from "../scheduling/validate-slot";
import type { CallIntakeState } from "./types";

export function slotPickPrompt(slots: SlotOffer[]): string {
  const lines = slots.map((s, i) => `Press ${i + 1} for ${s.label}.`);
  return (
    "Great news — we have some open visit windows! " +
    lines.join(" ") +
    " Just press the number for whichever time works best for you."
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

/** Re-validate the customer's DTMF slot pick before finalize. */
export async function confirmPhoneIntakeSlot(
  state: CallIntakeState,
): Promise<CallIntakeState> {
  const slot = state.selectedSlot;
  if (!slot?.id) return state;

  const priority = state.menuPriority ?? state.draft.priority ?? "P2";
  const check = await validateSlotAvailable({
    userId: state.userId,
    slot,
    priority,
  });

  if (check.ok) {
    return {
      ...state,
      selectedSlot: check.slot,
      draft: { ...state.draft, arrivalWindow: check.slot.label },
    };
  }

  return {
    ...state,
    phase: "final",
    selectedSlot: null,
    draft: { ...state.draft, arrivalWindow: "Pending — slot no longer available" },
  };
}
