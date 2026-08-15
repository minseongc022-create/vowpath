/** External deep links for Giu (maps, Zalo). */

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/** Embeddable map (no API key). */
export function googleMapsEmbedUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address.trim())}&z=16&output=embed`;
}

type LatLng = { lat: number; lng: number };

/**
 * Turn-by-turn directions in Google Maps.
 * Prefer lat/lng origin+destination for accuracy; address fallback for dest.
 */
export function googleMapsDirectionsUrl(opts: {
  origin?: LatLng | null;
  destination: LatLng | { address: string };
  travelmode?: "driving" | "walking" | "bicycling" | "transit";
}): string {
  const mode = opts.travelmode ?? "driving";
  const params = new URLSearchParams({ api: "1", travelmode: mode });

  if (opts.origin) {
    params.set("origin", `${opts.origin.lat},${opts.origin.lng}`);
  }

  if ("address" in opts.destination) {
    params.set("destination", opts.destination.address.trim());
  } else {
    params.set("destination", `${opts.destination.lat},${opts.destination.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function zaloChatUrl(zaloOrPhone: string): string | null {
  const digits = zaloOrPhone.replace(/\D/g, "");
  if (!digits) return null;
  // Zalo deep link accepts phone with country code (84…) or raw VN mobile.
  const id = digits.startsWith("84") ? digits : digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
  return `https://zalo.me/${id}`;
}
