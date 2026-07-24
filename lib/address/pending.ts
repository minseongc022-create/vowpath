/** Phone intake defers full address to the SMS portal (typed / Places, not STT). */

export const ADDRESS_PENDING_MARKER = "Pending — confirm on link";

export function isAddressPending(address: string | null | undefined): boolean {
  const a = (address ?? "").trim();
  if (!a || /^unknown$/i.test(a)) return true;
  if (/^pending/i.test(a)) return true;
  if (a.length < 8) return true;
  return false;
}

export function normalizePhoneIntakeAddress(raw: string | null | undefined): string {
  const a = (raw ?? "").trim();
  if (isAddressPending(a)) return ADDRESS_PENDING_MARKER;
  return a;
}
