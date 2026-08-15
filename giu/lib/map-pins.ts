import type { GiuBox, GiuMerchant } from "./types";
import { merchantCoords } from "./geo";

export type MapPin = {
  merchant: GiuMerchant;
  boxes: GiuBox[];
  lat: number;
  lng: number;
};

export function buildMapPins(boxes: GiuBox[], merchants: GiuMerchant[]): MapPin[] {
  const merchantMap = new Map(merchants.map((m) => [m.id, m]));
  const byMerchant = new Map<string, GiuBox[]>();
  for (const box of boxes) {
    if (box.status !== "mo" || box.quantityLeft <= 0) continue;
    const list = byMerchant.get(box.merchantId) ?? [];
    list.push(box);
    byMerchant.set(box.merchantId, list);
  }
  const pins: MapPin[] = [];
  for (const [merchantId, list] of byMerchant) {
    const merchant = merchantMap.get(merchantId);
    if (!merchant) continue;
    const coords = merchantCoords(merchant.id, merchant.district);
    pins.push({ merchant, boxes: list, ...coords });
  }
  return pins;
}
