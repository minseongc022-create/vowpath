/** Minutes after box pickupEnd before reservation expires (grace for late arrival). */
export const PICKUP_GRACE_MINUTES = 30;

/** Hours merchant grants when allowing late pickup. */
export const PICKUP_EXTENSION_HOURS = 24;

export const PICKUP_MAX_EXTENSIONS = 2;

/** After het_han + unanswered extension request, auto full refund for customer. */
export const PICKUP_AUTO_REFUND_HOURS = 72;

export function computePickupExpiresAt(boxPickupEndIso: string, now = Date.now()): string {
  const graceEnd = new Date(boxPickupEndIso).getTime() + PICKUP_GRACE_MINUTES * 60 * 1000;
  const minHold = now + 15 * 60 * 1000;
  return new Date(Math.max(graceEnd, minHold)).toISOString();
}

export function computeExtensionExpiresAt(hours = PICKUP_EXTENSION_HOURS, now = Date.now()): string {
  return new Date(now + hours * 60 * 60 * 1000).toISOString();
}
