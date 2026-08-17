import type { GiuBox } from "@/giu/lib/types";

export const MAX_BOX_IMAGES = 5;

export function normalizeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_BOX_IMAGES) break;
  }
  return out;
}

export function boxImages(box: Pick<GiuBox, "imageUrl" | "imageUrls">): string[] {
  if (box.imageUrls?.length) return box.imageUrls;
  if (box.imageUrl) return [box.imageUrl];
  return [];
}

export function primaryBoxImage(box: Pick<GiuBox, "imageUrl" | "imageUrls">): string | undefined {
  return boxImages(box)[0];
}

export function boxImageFields(urls: string[]): Pick<GiuBox, "imageUrl" | "imageUrls"> {
  const normalized = normalizeImageUrls(urls);
  if (!normalized.length) return {};
  return {
    imageUrl: normalized[0],
    imageUrls: normalized,
  };
}
