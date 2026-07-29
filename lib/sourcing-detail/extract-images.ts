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

export function upgradeCdnUrl(url: string): string {
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

function dedupeSkus(skus: SkuOption[]): SkuOption[] {
  const seen = new Set<string>();
  return skus.filter((s) => {
    const key = `${s.id}:${s.imageUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 1688 detail pages embed offer data in inline JSON / window context. */
export function parse1688OfferData(html: string): {
  title?: string;
  images: ListingImage[];
  skuOptions: SkuOption[];
} {
  const images: ListingImage[] = [];
  const skuOptions: SkuOption[] = [];
  let title: string | undefined;

  const normalized = html.replace(/\\u002F/g, "/").replace(/\\"/g, '"');

  const titlePatterns = [
    /"subject"\s*:\s*"([^"]+)"/,
    /"title"\s*:\s*"([^"]+)"/,
    /"offerTitle"\s*:\s*"([^"]+)"/,
    /"productTitle"\s*:\s*"([^"]+)"/,
  ];
  for (const re of titlePatterns) {
    const m = normalized.match(re);
    if (m?.[1] && m[1].length > 2) {
      title = m[1];
      break;
    }
  }

  const galleryRes = [
    /"imageList"\s*:\s*\[([\s\S]*?)\]/,
    /"offerImgList"\s*:\s*\[([\s\S]*?)\]/,
    /"images"\s*:\s*\[([\s\S]*?)\]/,
    /"mainImage"\s*:\s*\{[^}]*"images"\s*:\s*\[([\s\S]*?)\]/,
  ];
  for (const re of galleryRes) {
    const block = normalized.match(re)?.[1];
    if (!block) continue;
    for (const u of block.matchAll(/"(https?:[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)) {
      images.push({ url: upgradeCdnUrl(u[1]), source: "gallery" });
    }
  }

  const skuBlockRe = /"skuMap"\s*:\s*(\{[\s\S]*?\})\s*[,}]/;
  const skuBlock = normalized.match(skuBlockRe)?.[1];
  if (skuBlock) {
    for (const m of skuBlock.matchAll(
      /"(\d+)"\s*:\s*\{[^}]*"(?:specAttrs|specId)"\s*:\s*"([^"]*)"[^}]*"(?:skuPic|pic|imageUrl)"\s*:\s*"(https?:[^"]+)"/gi,
    )) {
      skuOptions.push({
        id: m[1],
        label: m[2] || `SKU-${m[1]}`,
        imageUrl: upgradeCdnUrl(m[3]),
      });
    }
  }

  for (const m of normalized.matchAll(
    /"name"\s*:\s*"([^"]+)"[^}]*"value"\s*:\s*"([^"]+)"[^}]*"(?:imageUrl|picUrl|skuPic)"\s*:\s*"(https?:[^"]+)"/gi,
  )) {
    skuOptions.push({
      id: `${m[1]}:${m[2]}`,
      label: `${m[1]} — ${m[2]}`,
      imageUrl: upgradeCdnUrl(m[3]),
    });
  }

  for (const m of normalized.matchAll(
    /"detailUrl"\s*:\s*"(https?:[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  )) {
    images.push({ url: upgradeCdnUrl(m[1]), source: "detail" });
  }

  for (const m of normalized.matchAll(
    /"(https?:\/\/(?:cbu01|img|gw)\.alicdn\.com[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  )) {
    images.push({ url: upgradeCdnUrl(m[1]), source: "unknown" });
  }

  return {
    title,
    images: dedupeImages(images),
    skuOptions: dedupeSkus(skuOptions),
  };
}

export function to1688MobileUrl(desktopUrl: string): string | null {
  try {
    const u = new URL(desktopUrl);
    if (!u.hostname.includes("1688.com")) return null;
    const offerMatch = u.pathname.match(/offer\/(\d+)/);
    if (offerMatch) {
      return `https://m.1688.com/offer/${offerMatch[1]}.html`;
    }
    return null;
  } catch {
    return null;
  }
}
