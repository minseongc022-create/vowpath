import type { ShopBookingSettings, SlotOffer } from "../booking-settings";
import { availableSlotsFromGrid, computeSlotGrid } from "./slot-grid";

export type BusyBlock = {
  startAt: string;
  endAt: string;
};

export function computeAvailableSlots(params: {
  settings: ShopBookingSettings;
  busyBlocks: BusyBlock[];
  priority: "P1" | "P2" | "P3";
  now?: Date;
  source: "jobber" | "native";
}): SlotOffer[] {
  const { settings, priority, source } = params;
  const maxOffers = Math.min(5, Math.max(1, settings.slotOfferCount));
  const grid = computeSlotGrid({ ...params, horizonDays: 14 });
  return availableSlotsFromGrid(grid, maxOffers, source);
}

export { computeSlotGrid, availableSlotsFromGrid } from "./slot-grid";
export type { SlotGridDay, SlotGridItem, SlotGridResult, SlotGridStatus } from "./slot-grid";
