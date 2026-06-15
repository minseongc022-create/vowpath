const US_ZIP = /\b(\d{5})(?:-\d{4})?\b/;

export function extractZipFromAddress(address: string): string | null {
  const match = address.match(US_ZIP);
  return match?.[1] ?? null;
}

/** Returns true if zip is allowed, or if no service area configured. */
export function isZipInServiceArea(
  zip: string | null | undefined,
  serviceAreaZips: string[],
): boolean {
  if (!serviceAreaZips.length) return true;
  if (!zip) return false;
  const normalized = zip.trim().slice(0, 5);
  return serviceAreaZips.some((z) => z.trim().slice(0, 5) === normalized);
}

export function serviceAreaRejectMessage(shopName?: string): string {
  const shop = shopName?.trim() || "Our team";
  return (
    `${shop}: Sorry, your address is outside our service area. ` +
    `Please call during business hours or visit our website.`
  );
}
