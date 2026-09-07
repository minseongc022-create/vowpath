import type { ReservationTask } from "./types";

export type ReservationProviderRoute = "haruwith_direct" | "partner_online" | "clawops_phone" | "manual";

export function routeReservationProvider(task: ReservationTask): ReservationProviderRoute {
  if (task.bookingMethod === "haruon_direct") return "haruwith_direct";
  if (task.phoneNumber) return "clawops_phone";
  if (["external_online", "external_platform"].includes(task.bookingMethod)) return "partner_online";
  return "manual";
}
