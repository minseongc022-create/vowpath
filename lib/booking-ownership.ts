import { resolveBookingForTenant } from "./booking-resolve";

/**
 * Ensures a booking id belongs to this tenant before status changes.
 */
export async function verifyBookingBelongsToTenant(
  userId: string,
  bookingId: string,
): Promise<boolean> {
  const id = bookingId.trim();
  if (!id) return false;
  const resolved = await resolveBookingForTenant(userId, id);
  return resolved !== null;
}
