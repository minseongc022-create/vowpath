import type { GiuDistrict } from "./types";

/** Approximate HCMC district centers (WGS84). */
export const DISTRICT_COORDS: Record<GiuDistrict, { lat: number; lng: number }> = {
  quan_1: { lat: 10.7769, lng: 106.7009 },
  quan_3: { lat: 10.7841, lng: 106.6846 },
  quan_5: { lat: 10.754, lng: 106.6665 },
  quan_7: { lat: 10.732, lng: 106.7215 },
  quan_10: { lat: 10.773, lng: 106.6675 },
  binh_thanh: { lat: 10.8106, lng: 106.709 },
  phu_nhuan: { lat: 10.7991, lng: 106.6802 },
};

export const HCMC_CENTER = { lat: 10.7769, lng: 106.7009 };
export const HCMC_DEFAULT_ZOOM = 13;

/** Stable jitter so nearby shops in same district don't stack perfectly. */
export function merchantCoords(
  merchantId: string,
  district: GiuDistrict,
): { lat: number; lng: number } {
  const base = DISTRICT_COORDS[district] ?? HCMC_CENTER;
  let hash = 0;
  for (let i = 0; i < merchantId.length; i++) {
    hash = (hash * 31 + merchantId.charCodeAt(i)) >>> 0;
  }
  const dLat = ((hash % 200) - 100) / 12000; // ~±0.008°
  const dLng = (((hash >> 8) % 200) - 100) / 12000;
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number, locale: "ko" | "vi"): string {
  if (meters < 1000) {
    return locale === "vi" ? `${Math.round(meters)} m` : `${Math.round(meters)}m`;
  }
  const km = (meters / 1000).toFixed(1);
  return locale === "vi" ? `${km} km` : `${km}km`;
}
