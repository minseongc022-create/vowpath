/** External deep links for Giu (maps, Zalo). */

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

export function zaloChatUrl(zaloOrPhone: string): string | null {
  const digits = zaloOrPhone.replace(/\D/g, "");
  if (!digits) return null;
  // Zalo deep link accepts phone with country code (84…) or raw VN mobile.
  const id = digits.startsWith("84") ? digits : digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
  return `https://zalo.me/${id}`;
}
