/** Missing / unusable address — customer must confirm on the SMS portal. */

export const ADDRESS_PENDING_MARKER = "Pending — confirm on link";

export function isAddressPending(address: string | null | undefined): boolean {
  const a = (address ?? "").trim();
  if (!a || /^unknown$/i.test(a)) return true;
  if (/^pending/i.test(a)) return true;
  if (a.length < 8) return true;
  return false;
}

/**
 * Prefer a real spoken address when present; only fall back to the pending
 * marker when the phone call did not capture a usable street address.
 */
export function normalizePhoneIntakeAddress(raw: string | null | undefined): string {
  const a = (raw ?? "").trim();
  if (isAddressPending(a)) return ADDRESS_PENDING_MARKER;
  return a;
}

/** Prefer tool/spoken address over transcript extraction when both exist. */
export function preferSpokenPhoneAddress(
  toolAddress: string | null | undefined,
  extractedAddress: string | null | undefined,
): string {
  const spoken = (toolAddress ?? "").trim();
  if (!isAddressPending(spoken)) return spoken;
  return normalizePhoneIntakeAddress(extractedAddress);
}
