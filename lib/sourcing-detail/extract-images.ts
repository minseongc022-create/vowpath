import type { ListingImage, SkuOption } from "./types";

const IMAGE_URL_RE =
  /https?:\/\/[^"'\\\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi;

/** Alibaba CDN hosts commonly used on 1688 / Taobao / Tmall detail pages. */
const CDN_HOST_HINTS = [
  "alicdn.com",
  "tbcdn.cn",
  "1688.com",
  "alibaba.com",
  "taobaocdn",
];

function upgradeCdnUrl(url: string): string {
  let u = url.replace(/\\u002F/g, "/").replace(/\\/g, "");
  // Prefer larger variants when Alibaba uses size suffixes.
  u = u.replace(/_\d+x\d+\.(jpg|jpeg|png|webp)/i, ".$1");
  u = u.replace(/\.sum\.(jpg|jpeg|png|webp)/i, ".$1");
  return u;
}

function isLikelyProductImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("sprite") || lower.includes("icon") || lower.includes("logo")) {
    return false;
  }
  if (lower.includes("avatar") || lower.includes("emoji")) return false;
  if (!CDN_HOST_HINTS.some((h) => lower.includes(h))) {
    // Still allow generic image URLs from unknown hosts if they look like photos.
    if (!/\.(jpg|jpeg|png|webp)/i.test(lower)) return false;
  }
  return true;
}

export function extractImageUrlsFromHtml(html: string): string[] {
  const found = new Set<string>();

  for (const match of html.matchAll(IMAGE_URL_RE)) {
    const raw = match[0];
    const upgraded = upgradeCdnUrl(raw);
    if (isLikelyProductImage(upgraded)) found.add(upgraded);
  }

  // JSON blobs often embed escaped URLs.
  const jsonish = html.replace(/\\u002F/g, "/").replace(/\\"/g, '"');
  for (const match of jsonish.matchAll(IMAGE_URL_RE)) {
    const upgraded = upgradeCdnUrl(match[0]);
    if (isLikelyProductImage(upgraded)) found.add(upgraded);
  }

  return [...found];
}

export function toListingImages(urls: string[]): ListingImage[] {
  return urls.map((url) => ({ url, source: "unknown" }));
}

/** Parse simple SKU rows from inline JSON when present (Taobao / 1688). */
export function extractSkuOptionsFromHtml(html: string): SkuOption[] {
  const options: SkuOption[] = [];
  const skuImgRe =
    /"propPath"\s*:\s*"([^"]+)"[^}]*?"skuUrl"\s*:\s*"(https?:[^"]+)"/gi;
  for (const m of html.matchAll(skuImgRe)) {
    options.push({
      id: m[1],
      label: m[1].replace(/;/g, " / "),
      imageUrl: upgradeCdnUrl(m[2]),
    });
  }

  const altRe =
    /"skuId"\s*:\s*"?(\d+)"?[^}]*?"prop"\s*:\s*"([^"]+)"[^}]*?"(?:pic|image|skuPic)"\s*:\s*"(https?:[^"]+)"/gi;
  for (const m of html.matchAll(altRe)) {
    options.push({
      id: m[1],
      label: m[2],
      imageUrl: upgradeCdnUrl(m[3]),
    });
  }

  const seen = new Set<string>();
  return options.filter((o) => {
    const key = `${o.id}:${o.imageUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeImages(images: ListingImage[]): ListingImage[] {
  const seen = new Set<string>();
  const out: ListingImage[] = [];
  for (const img of images) {
    const key = img.url.replace(/\?.*$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(img);
  }
  return out;
}
