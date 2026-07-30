import type { ListingAttribute, ListingImage, SkuOption } from "./types";

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
  if (u.startsWith("//")) u = `https:${u}`;
  if (u.startsWith("http://")) u = u.replace(/^http:\/\//i, "https://");
  // Prefer larger variants when Alibaba uses size suffixes.
  u = u.replace(/_\d+x\d+\.(jpg|jpeg|png|webp)/i, ".$1");
  u = u.replace(/\.sum\.(jpg|jpeg|png|webp)/i, ".$1");
  u = u.replace(/_Q\d+\.(jpg|jpeg|png|webp)/i, ".$1");
  return u;
}

/**
 * Reject 1688 chrome / logos / tiny UI assets.
 * Prefer ibank / real offer photos.
 */
export function isLikelyProductImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (!/^https?:\/\//i.test(lower) && !lower.startsWith("//")) return false;

  if (
    /sprite|favicon|avatar|emoji|\/tfs\/|av-auth-doc|punish|qrcode|placeholder|default_img|blank\.|1x1\.|pixel/.test(
      lower,
    )
  ) {
    return false;
  }
  if (/(?:^|\/)(?:logo|icon)(?:[_./-]|$)/.test(lower) || lower.includes("logo.")) {
    return false;
  }

  // Alibaba UI toolkit sizes: ...-tps-34-34.png / ...-tps-820-82.png
  const tps = lower.match(/tps-(\d+)-(\d+)/);
  if (tps) {
    const w = Number(tps[1]);
    const h = Number(tps[2]);
    if (w < 220 || h < 220) return false;
    // Wide banners are chrome, not product shots
    if (w > 0 && h > 0 && (w / h > 3.5 || h / w > 3.5)) return false;
  }

  const isIbank =
    /\/img\/ibank\//.test(lower) ||
    /!!\d+-0-cib\.(jpg|jpeg|png|webp)/.test(lower) ||
    /\/ibank\/\d{4}\//.test(lower);

  // imgextra UI chrome often lacks cib/ibank
  if (/imgextra/.test(lower) && !isIbank && /-\d{2,4}-\d{2,4}\.png/.test(lower)) {
    return false;
  }

  if (!CDN_HOST_HINTS.some((h) => lower.includes(h))) {
    if (!/\.(jpg|jpeg|png|webp)/i.test(lower)) return false;
  }
  return true;
}

export function filterProductImages(images: ListingImage[]): ListingImage[] {
  return images.filter((img) => isLikelyProductImage(img.url));
}

export function extractImageUrlsFromHtml(html: string): string[] {
  const found = new Set<string>();

  for (const match of html.matchAll(IMAGE_URL_RE)) {
    const upgraded = upgradeCdnUrl(match[0]);
    if (isLikelyProductImage(upgraded)) found.add(upgraded);
  }

  const jsonish = html.replace(/\\u002F/g, "/").replace(/\\"/g, '"');
  for (const match of jsonish.matchAll(IMAGE_URL_RE)) {
    const upgraded = upgradeCdnUrl(match[0]);
    if (isLikelyProductImage(upgraded)) found.add(upgraded);
  }

  return [...found];
}

export function toListingImages(urls: string[], source: ListingImage["source"] = "unknown"): ListingImage[] {
  return urls.filter(isLikelyProductImage).map((url) => ({ url, source }));
}

/** Parse simple SKU rows from inline JSON when present (Taobao / 1688). */
export function extractSkuOptionsFromHtml(html: string): SkuOption[] {
  const options: SkuOption[] = [];
  const skuImgRe =
    /"propPath"\s*:\s*"([^"]+)"[^}]*?"skuUrl"\s*:\s*"(https?:[^"]+)"/gi;
  for (const m of html.matchAll(skuImgRe)) {
    const imageUrl = upgradeCdnUrl(m[2]);
    if (!isLikelyProductImage(imageUrl)) continue;
    options.push({
      id: m[1],
      label: m[1].replace(/;/g, " / "),
      imageUrl,
    });
  }

  const altRe =
    /"skuId"\s*:\s*"?(\d+)"?[^}]*?"prop"\s*:\s*"([^"]+)"[^}]*?"(?:pic|image|skuPic)"\s*:\s*"(https?:[^"]+)"/gi;
  for (const m of html.matchAll(altRe)) {
    const imageUrl = upgradeCdnUrl(m[3]);
    if (!isLikelyProductImage(imageUrl)) continue;
    options.push({
      id: m[1],
      label: m[2],
      imageUrl,
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

function pushImage(images: ListingImage[], url: string, source: ListingImage["source"]) {
  const upgraded = upgradeCdnUrl(url);
  if (!isLikelyProductImage(upgraded)) return;
  images.push({ url: upgraded, source });
}

/** 1688 detail pages embed offer data in inline JSON / window context. */
export function parse1688OfferData(
  html: string,
  opts?: { offerId?: string | null },
): {
  title?: string;
  priceText?: string;
  priceCny?: number;
  moq?: string;
  sellerName?: string;
  attributes: ListingAttribute[];
  images: ListingImage[];
  skuOptions: SkuOption[];
} {
  const images: ListingImage[] = [];
  const skuOptions: SkuOption[] = [];
  const attributes: ListingAttribute[] = [];
  let title: string | undefined;
  let priceText: string | undefined;
  let priceCny: number | undefined;
  let moq: string | undefined;
  let sellerName: string | undefined;

  const normalized = html.replace(/\\u002F/g, "/").replace(/\\"/g, '"');
  const offerId = opts?.offerId ?? null;

  // If caller expects a specific offer, refuse unrelated factory/company chrome pages
  // that never mention that offerId (common geo-fallback yellow pages).
  if (offerId && !normalized.includes(offerId)) {
    return {
      title: undefined,
      priceText: undefined,
      priceCny: undefined,
      moq: undefined,
      sellerName: undefined,
      attributes: [],
      images: [],
      skuOptions: [],
    };
  }

  const titlePatterns = [
    /"subject"\s*:\s*"([^"]+)"/,
    /"offerTitle"\s*:\s*"([^"]+)"/,
    /"productTitle"\s*:\s*"([^"]+)"/,
    /"title"\s*:\s*"([^"]{4,120})"/,
  ];
  for (const re of titlePatterns) {
    const m = normalized.match(re);
    if (m?.[1] && m[1].length > 2 && !/企业信息|黄页|404/.test(m[1])) {
      title = m[1];
      break;
    }
  }

  const pricePatterns = [
    /"price"\s*:\s*"?(?:¥|￥)?(\d+(?:\.\d+)?)"?/,
    /"offerPrice"\s*:\s*"?(?:¥|￥)?(\d+(?:\.\d+)?)"?/,
    /"priceDisplay"\s*:\s*"([^"]+)"/,
  ];
  for (const re of pricePatterns) {
    const m = normalized.match(re);
    if (m?.[1]) {
      priceText = m[1].startsWith("¥") || m[1].startsWith("￥") ? m[1] : `¥${m[1]}`;
      const n = Number(String(m[1]).replace(/[^\d.]/g, ""));
      if (Number.isFinite(n) && n > 0) priceCny = n;
      break;
    }
  }

  const moqMatch = normalized.match(/"(?:minOrderQuantity|beginAmount|moq)"\s*:\s*"?(\d+)"?/i);
  if (moqMatch?.[1]) moq = moqMatch[1];

  const sellerMatch =
    normalized.match(/"companyName"\s*:\s*"([^"]+)"/) ??
    normalized.match(/"loginId"\s*:\s*"([^"]+)"/);
  if (sellerMatch?.[1] && !/企业信息/.test(sellerMatch[1])) {
    sellerName = sellerMatch[1];
  }

  for (const m of normalized.matchAll(
    /"name"\s*:\s*"([^"]{1,40})"\s*,\s*"value"\s*:\s*"([^"]{1,80})"/g,
  )) {
    if (attributes.length >= 24) break;
    const name = m[1];
    const value = m[2];
    if (/image|pic|url|http/i.test(name)) continue;
    attributes.push({ name, value });
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
      pushImage(images, u[1], "gallery");
    }
    // relative //img.alicdn.com/...
    for (const u of block.matchAll(/"(\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)) {
      pushImage(images, `https:${u[1]}`, "gallery");
    }
  }

  // Offer-scoped entries inside factory pageData offer lists
  if (offerId) {
    const offerChunkRe = new RegExp(
      `\\{[^{}]*"offerId"\\s*:\\s*"?${offerId}"?[^{}]*\\}`,
      "gi",
    );
    for (const chunk of normalized.matchAll(offerChunkRe)) {
      const block = chunk[0];
      const t = block.match(/"(?:title|subject)"\s*:\s*"([^"]+)"/);
      if (t?.[1] && !title) title = t[1];
      const img = block.match(/"(?:image|imageUrl|pic)"\s*:\s*"(https?:[^"]+)"/i);
      if (img?.[1]) pushImage(images, img[1], "gallery");
    }
  }

  const skuBlockRe = /"skuMap"\s*:\s*(\{[\s\S]*?\})\s*[,}]/;
  const skuBlock = normalized.match(skuBlockRe)?.[1];
  if (skuBlock) {
    for (const m of skuBlock.matchAll(
      /"(\d+)"\s*:\s*\{[^}]*"(?:specAttrs|specId)"\s*:\s*"([^"]*)"[^}]*"(?:skuPic|pic|imageUrl)"\s*:\s*"(https?:[^"]+)"/gi,
    )) {
      const imageUrl = upgradeCdnUrl(m[3]);
      if (!isLikelyProductImage(imageUrl)) continue;
      skuOptions.push({
        id: m[1],
        label: m[2] || `SKU-${m[1]}`,
        imageUrl,
      });
    }
  }

  for (const m of normalized.matchAll(
    /"name"\s*:\s*"([^"]+)"[^}]*"value"\s*:\s*"([^"]+)"[^}]*"(?:imageUrl|picUrl|skuPic)"\s*:\s*"(https?:[^"]+)"/gi,
  )) {
    const imageUrl = upgradeCdnUrl(m[3]);
    if (!isLikelyProductImage(imageUrl)) continue;
    skuOptions.push({
      id: `${m[1]}:${m[2]}`,
      label: `${m[1]} — ${m[2]}`,
      imageUrl,
    });
  }

  for (const m of normalized.matchAll(
    /"detailUrl"\s*:\s*"(https?:[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  )) {
    pushImage(images, m[1], "detail");
  }

  // Only harvest ibank product photos in catch-all — never generic UI imgextra/tfs
  for (const m of normalized.matchAll(
    /"(https?:\/\/cbu01\.alicdn\.com\/img\/ibank\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  )) {
    pushImage(images, m[1], "unknown");
  }

  return {
    title,
    priceText,
    priceCny,
    moq,
    sellerName,
    attributes,
    images: dedupeImages(images),
    skuOptions: dedupeSkus(skuOptions),
  };
}

export function to1688MobileUrl(desktopUrl: string): string | null {
  const offerId = extract1688OfferId(desktopUrl);
  return offerId ? `https://m.1688.com/offer/${offerId}.html` : null;
}

/** Extract numeric offerId from detail/mobile/qr/share URLs or paste text */
export function extract1688OfferId(raw: string): string | null {
  const text = String(raw ?? "");
  const patterns = [
    /offer\/(\d{6,})/i,
    /[?&]offerId=(\d{6,})/i,
    /offerId["'\s:=]+(\d{6,})/i,
    /[?&]id=(\d{6,})(?:\.html)?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function to1688FactoryCardUrl(offerId: string): string {
  return `https://sale.1688.com/factory/card.html?offerId=${offerId}`;
}

export function to1688DetailUrl(offerId: string): string {
  return `https://detail.1688.com/offer/${offerId}.html`;
}
