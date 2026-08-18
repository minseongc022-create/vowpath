/** External deep links for Giu (maps, Zalo). */

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/** Embeddable map (no API key). */
export function googleMapsEmbedUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address.trim())}&z=16&output=embed`;
}

type LatLng = { lat: number; lng: number };

/** Search place on Naver Map (mobile web / app). Reliable entry when directions URL cannot resolve start. */
export function naverMapsSearchUrl(address: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(address.trim())}`;
}

/** WGS84 → EPSG:3857 for Naver web map paths. */
export function naverMercatorCoords(lat: number, lng: number): { x: number; y: number } {
  const r = 6378137;
  const x = (lng * Math.PI) / 180 * r;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2)) * r;
  return { x, y };
}

/**
 * Legacy directions URL (desktop). Avoid on mobile web — start `-` needs geolocation and throws lng errors.
 */
export function naverMapsDirectionsUrl(opts: {
  address: string;
  destination?: LatLng | null;
  placeName?: string;
  mode?: "car" | "walk" | "transit";
}): string {
  const mode = opts.mode ?? "car";
  const address = opts.address.trim();
  const name = (opts.placeName ?? address).trim();

  if (
    opts.destination &&
    Number.isFinite(opts.destination.lat) &&
    Number.isFinite(opts.destination.lng)
  ) {
    const { x, y } = naverMercatorCoords(opts.destination.lat, opts.destination.lng);
    const dest = `${x},${y},${encodeURIComponent(name)}`;
    return `https://map.naver.com/p/directions/-/${dest}/-/${mode}`;
  }

  return naverMapsSearchUrl(address || name);
}

/** Naver Map app deep link — destination only; app uses device location as start. */
export function naverMapsAppDirectionsUrl(opts: {
  lat: number;
  lng: number;
  name?: string;
  mode?: "car" | "walk" | "public";
}): string {
  const mode = opts.mode ?? "car";
  const params = new URLSearchParams({
    dlat: String(opts.lat),
    dlng: String(opts.lng),
    appname: "giucuu",
  });
  if (opts.name?.trim()) {
    params.set("dname", opts.name.trim());
  }
  return `nmap://route/${mode}?${params.toString()}`;
}

/**
 * Android Chrome / WebView: intent URL opens Naver app or falls back to web search.
 */
export function naverMapsAndroidIntentUrl(opts: {
  lat: number;
  lng: number;
  name?: string;
  webFallback: string;
  mode?: "car" | "walk" | "public";
}): string {
  const mode = opts.mode ?? "car";
  const params = new URLSearchParams({
    dlat: String(opts.lat),
    dlng: String(opts.lng),
    appname: "giucuu",
  });
  if (opts.name?.trim()) {
    params.set("dname", opts.name.trim());
  }
  const fallback = encodeURIComponent(opts.webFallback);
  return `intent://route/${mode}?${params.toString()}#Intent;scheme=nmap;package=com.nhn.android.nmap;S.browser_fallback_url=${fallback};end`;
}

/** Best href for opening Naver navigation on this device (client-side). */
export function naverMapsOpenHref(opts: {
  address: string;
  destination?: LatLng | null;
  placeName?: string;
  mode?: "car" | "walk" | "transit";
  userAgent?: string;
}): string {
  const searchUrl = naverMapsSearchUrl(opts.address);
  const ua = opts.userAgent ?? "";
  const dest = opts.destination;
  const hasCoords =
    dest &&
    Number.isFinite(dest.lat) &&
    Number.isFinite(dest.lng);

  const name = opts.placeName ?? opts.address;
  const appMode = opts.mode === "walk" ? "walk" : opts.mode === "transit" ? "public" : "car";

  if (/Android/i.test(ua) && hasCoords) {
    return naverMapsAndroidIntentUrl({
      lat: dest.lat,
      lng: dest.lng,
      name,
      webFallback: searchUrl,
      mode: appMode,
    });
  }

  if (/iPhone|iPad|iPod/i.test(ua) && hasCoords) {
    return naverMapsAppDirectionsUrl({
      lat: dest.lat,
      lng: dest.lng,
      name,
      mode: appMode,
    });
  }

  return searchUrl;
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
