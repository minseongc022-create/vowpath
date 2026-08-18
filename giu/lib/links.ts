/** External deep links for Giu (maps, Zalo). */

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/** Embeddable map (no API key). */
export function googleMapsEmbedUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address.trim())}&z=16&output=embed`;
}

type LatLng = { lat: number; lng: number };

/** Search place on Naver Map (mobile web / app). */
export function naverMapsSearchUrl(address: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(address.trim())}`;
}

/**
 * Turn-by-turn directions on Naver Map.
 * Start `-` = current location; destination is address or lng,lat,name.
 */
export function naverMapsDirectionsUrl(opts: {
  address: string;
  destination?: LatLng | null;
  placeName?: string;
  mode?: "car" | "walk" | "transit";
}): string {
  const mode = opts.mode ?? "car";
  const name = (opts.placeName ?? opts.address).trim();
  const dest =
    opts.destination &&
    Number.isFinite(opts.destination.lat) &&
    Number.isFinite(opts.destination.lng)
      ? `${opts.destination.lng},${opts.destination.lat},${encodeURIComponent(name)}`
      : encodeURIComponent(opts.address.trim());
  return `https://map.naver.com/v5/directions/-/${dest}/-/${mode}`;
}

/** Naver Map app deep link (Android/iOS). */
export function naverMapsAppDirectionsUrl(opts: {
  lat: number;
  lng: number;
  name: string;
}): string {
  const params = new URLSearchParams({
    dlat: String(opts.lat),
    dlng: String(opts.lng),
    dname: opts.name.trim(),
    appname: "giucuu",
  });
  return `nmap://route/car?${params.toString()}`;
}

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
