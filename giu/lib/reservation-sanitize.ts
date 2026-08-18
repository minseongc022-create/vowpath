import type { GiuReservation } from "./types";

export type MerchantSafeReservation = Omit<GiuReservation, "code">;

export function stripPickupCodeForMerchant(reservation: GiuReservation): MerchantSafeReservation {
  const { code: _code, ...safe } = reservation;
  return safe;
}

export function stripPickupCodesForMerchant(
  reservations: GiuReservation[],
): MerchantSafeReservation[] {
  return reservations.map(stripPickupCodeForMerchant);
}
