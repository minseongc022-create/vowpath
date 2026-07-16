import type { ShopBookingSettings, SlotOffer } from "../booking-settings";
import { computeSlotGrid, availableSlotsFromGrid } from "./slot-grid";
import type { LaneBooking } from "./tech-lanes";

export type BusyBlock = {
  startAt: string;
  endAt: string;
};

export function computeAvailableSlots(params: {
  settings: ShopBookingSettings;
  laneBookings: LaneBooking[];
  externalBlocks: BusyBlock[];
  capacity: number;
  timeZone: string;
  priority: "P1" | "P2" | "P3";
  now?: Date;
  source: "jobber" | "native";
  jobberScheduleUncertain?: boolean;
}): SlotOffer[] {
  const { settings, priority, source } = params;
  const maxOffers = Math.min(5, Math.max(1, settings.slotOfferCount));
  const grid = computeSlotGrid({ ...params, horizonDays: 14 });
  return availableSlotsFromGrid(grid, maxOffers, source, priority);
}

export { computeSlotGrid, availableSlotsFromGrid } from "./slot-grid";
export type { SlotGridDay, SlotGridItem, SlotGridResult, SlotGridStatus } from "./slot-grid";
