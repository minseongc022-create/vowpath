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
 * Start `-` = current location; destination is address (preferred) or lng,lat,name.
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

  // Prefer Korean street address — Naver geocodes more reliably than jittered coords.
  const dest =
    address.length > 0
      ? encodeURIComponent(address)
      : opts.destination &&
          Number.isFinite(opts.destination.lat) &&
          Number.isFinite(opts.destination.lng)
        ? `${opts.destination.lng},${opts.destination.lat},${encodeURIComponent(name)}`
        : encodeURIComponent(name);

  return `https://map.naver.com/p/directions/-/${dest}/-/${mode}`;
}

/** Naver Map app deep link (Android/iOS). */
export function naverMapsAppDirectionsUrl(opts: {
  lat: number;
  lng: number;
  name?: string;
}): string {
  const params = new URLSearchParams({
    dlat: String(opts.lat),
    dlng: String(opts.lng),
    appname: "giucuu",
  });
  if (opts.name?.trim()) {
    params.set("dname", opts.name.trim());
  }
  return `nmap://route/car?${params.toString()}`;
}

/**
 * Android Chrome / WebView: intent URL opens Naver app or falls back to web.
 * @see https://dev.to/piyaklabs/routing-around-google-maps-in-korea-naver-kakao-deep-links-weird-coordinates-and-ios-clipboard-25mf
 */
export function naverMapsAndroidIntentUrl(opts: {
  lat: number;
  lng: number;
  name?: string;
  webFallback: string;
}): string {
  const params = new URLSearchParams({
    dlat: String(opts.lat),
    dlng: String(opts.lng),
    appname: "giucuu",
  });
  if (opts.name?.trim()) {
    params.set("dname", opts.name.trim());
  }
  const fallback = encodeURIComponent(opts.webFallback);
  return `intent://route/car?${params.toString()}#Intent;scheme=nmap;package=com.nhn.android.nmap;S.browser_fallback_url=${fallback};end`;
}

/** Best href for opening Naver directions on this device (client-side). */
export function naverMapsOpenHref(opts: {
  address: string;
  destination?: LatLng | null;
  placeName?: string;
  mode?: "car" | "walk" | "transit";
  userAgent?: string;
}): string {
  const webUrl = naverMapsDirectionsUrl(opts);
  const ua = opts.userAgent ?? "";
  const isAndroid = /Android/i.test(ua);
  const dest = opts.destination;
  const hasCoords =
    dest &&
    Number.isFinite(dest.lat) &&
    Number.isFinite(dest.lng);

  if (isAndroid && hasCoords) {
    return naverMapsAndroidIntentUrl({
      lat: dest.lat,
      lng: dest.lng,
      name: opts.placeName ?? opts.address,
      webFallback: webUrl,
    });
  }

  return webUrl;
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
