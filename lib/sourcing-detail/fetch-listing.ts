import { detectPlatform, extractShareTitle, normalizeListingUrl } from "./platforms";
import {
  dedupeImages,
  extract1688OfferId,
  extractImageUrlsFromHtml,
  extractSkuOptionsFromHtml,
  filterProductImages,
  parse1688OfferData,
  to1688DetailUrl,
  to1688FactoryCardUrl,
  to1688MobileUrl,
  toListingImages,
} from "./extract-images";
import {
  fetch1688ViaJina,
  shouldPreferJina1688,
} from "./jina-1688";
import type { ScrapedListing } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const FETCH_TIMEOUT_MS = 25_000;

function extractTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeHtmlEntities(og[1].trim());

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) {
    const t = decodeHtmlEntities(title[1].trim());
    if (!/访问被拒绝|denied|403|企业信息|黄页|404/i.test(t)) return t;
  }
  return undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isPunishOrEmpty(html: string): boolean {
  if (!html || html.length < 800) return true;
  return /rgv587_flag|cloud_ip_bl|action"\s*:\s*"deny"|punish:resource/i.test(html);
}

async function fetchHtml(url: string, mobile = false): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": mobile ? MOBILE_UA : USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ko;q=0.7",
        Referer: "https://www.1688.com/",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`FETCH_FAILED_${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtmlSafe(url: string, mobile = false): Promise<string> {
  if (!url) return "";
  try {
    return await fetchHtml(url, mobile);
  } catch {
    return "";
  }
}

function merge1688Parse(
  html: string,
  base: ScrapedListing,
  offerId: string | null,
): ScrapedListing {
  const parsed = parse1688OfferData(html, { offerId });
  const genericImages = dedupeImages(
    toListingImages(extractImageUrlsFromHtml(html), "unknown"),
  );
  const genericSkus = extractSkuOptionsFromHtml(html);

  // Prefer structured gallery/sku; only keep generic if we already have offer-scoped HTML
  const preferGeneric = Boolean(offerId && html.includes(offerId));
  const images = filterProductImages(
    dedupeImages([
      ...parsed.images,
      ...base.images,
      ...(preferGeneric ? genericImages : []),
    ]),
  ).slice(0, 60);

  const skuMap = new Map<string, (typeof parsed.skuOptions)[0]>();
  for (const s of [...parsed.skuOptions, ...(preferGeneric ? genericSkus : []), ...base.skuOptions]) {
    if (s.imageUrl && !filterProductImages([{ url: s.imageUrl, source: "sku" }]).length) {
      continue;
    }
    skuMap.set(`${s.id}:${s.imageUrl ?? ""}`, s);
  }

  return {
    ...base,
    title: parsed.title ?? base.title,
    priceText: parsed.priceText ?? base.priceText,
    priceCny: parsed.priceCny ?? base.priceCny,
    moq: parsed.moq ?? base.moq,
    sellerName: parsed.sellerName ?? base.sellerName,
    attributes:
      parsed.attributes.length > 0 ? parsed.attributes : base.attributes,
    images,
    skuOptions: [...skuMap.values()],
    rawImageCount: images.length + skuMap.size,
  };
}

async function resolve1688OfferId(url: string): Promise<{ offerId: string | null; htmlHint: string }> {
  let offerId = extract1688OfferId(url);
  if (offerId) return { offerId, htmlHint: "" };

  if (!/qr\.1688\.com|s\.click\.|u\.1688\.com/i.test(url)) {
    return { offerId: null, htmlHint: "" };
  }

  try {
    const html = await fetchHtml(url, true);
    offerId = extract1688OfferId(html) ?? extract1688OfferId(url);
    return { offerId, htmlHint: html };
  } catch {
    return { offerId: null, htmlHint: "" };
  }
}

export async function scrapeListing(
  url: string,
  opts?: { pasteText?: string },
): Promise<ScrapedListing> {
  const pasteText = opts?.pasteText ?? url;
  const shareTitle = extractShareTitle(pasteText);
  const normalizedInput = normalizeListingUrl(url);
  const platform = detectPlatform(normalizedInput);

  let canonicalUrl = normalizedInput;
  let htmlParts: string[] = [];
  let imageUrls: string[] = [];
  let offerId: string | null = null;
  let blocked = false;

  let jinaPromise: Promise<Awaited<ReturnType<typeof fetch1688ViaJina>> | null> | null = null;

  if (platform === "1688") {
    const resolved = await resolve1688OfferId(normalizedInput);
    offerId = resolved.offerId;
    if (resolved.htmlHint) htmlParts.push(resolved.htmlHint);

    if (offerId) {
      canonicalUrl = to1688DetailUrl(offerId);
      // Overseas / cloud IPs are blocked by 1688 — always fetch Jina in parallel.
      jinaPromise = fetch1688ViaJina(offerId);

      // Detail + mobile first (real offer pages). Factory card often serves unrelated
      // company yellow pages when cloud IPs are blocked — only use if offerId appears.
      const mobileHtml = await fetchHtmlSafe(to1688MobileUrl(canonicalUrl) ?? "", true);
      if (mobileHtml) {
        if (isPunishOrEmpty(mobileHtml)) blocked = true;
        else {
          htmlParts.push(mobileHtml);
          imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(mobileHtml)];
        }
      }

      const deskHtml = await fetchHtmlSafe(canonicalUrl);
      if (deskHtml) {
        if (isPunishOrEmpty(deskHtml)) blocked = true;
        else {
          htmlParts.push(deskHtml);
          imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(deskHtml)];
        }
      }

      if (imageUrls.length < 2) {
        const cardHtml = await fetchHtmlSafe(to1688FactoryCardUrl(offerId));
        if (cardHtml && cardHtml.includes(offerId) && !isPunishOrEmpty(cardHtml)) {
          htmlParts.push(cardHtml);
          imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(cardHtml)];
        }
      }
    } else {
      const html = await fetchHtmlSafe(normalizedInput);
      if (isPunishOrEmpty(html)) blocked = true;
      else {
        htmlParts.push(html);
        imageUrls = extractImageUrlsFromHtml(html);
      }
    }
  } else {
    const html = await fetchHtml(normalizedInput);
    htmlParts.push(html);
    imageUrls = extractImageUrlsFromHtml(html);

    if (imageUrls.length < 3) {
      try {
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage({ userAgent: USER_AGENT, locale: "zh-CN" });
          await page.goto(normalizedInput, {
            waitUntil: "domcontentloaded",
            timeout: FETCH_TIMEOUT_MS,
          });
          await page.waitForTimeout(2500);
          const pw = await page.content();
          htmlParts.push(pw);
          imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(pw)];
        } finally {
          await browser.close();
        }
      } catch {
        /* optional */
      }
    }
  }

  const html = htmlParts.join("\n<!-- part -->\n");
  const skuOptions = extractSkuOptionsFromHtml(html);
  const skuImages = skuOptions.map((s) => s.imageUrl).filter((u): u is string => Boolean(u));
  const allUrls = [...imageUrls, ...skuImages];

  let listing: ScrapedListing = {
    platform,
    url: canonicalUrl,
    title: extractTitle(html),
    titleKo: shareTitle,
    images: filterProductImages(dedupeImages(toListingImages(allUrls))).slice(0, 60),
    skuOptions,
    attributes: [],
    rawImageCount: allUrls.length,
  };

  if (platform === "1688") {
    listing = merge1688Parse(html, listing, offerId);
  }

  listing.images = filterProductImages(listing.images);
  listing.titleKo = listing.titleKo ?? shareTitle;
  if (!listing.title && shareTitle) listing.title = shareTitle;

  if (platform === "1688" && offerId && jinaPromise) {
    const viaJina = await jinaPromise;
    const preferJina =
      viaJina &&
      viaJina.images.length > 0 &&
      shouldPreferJina1688({ blocked, images: listing.images });

    if (viaJina && (preferJina || listing.images.length === 0)) {
      const mergedImages = filterProductImages(
        dedupeImages([
          ...(preferJina ? viaJina.images : []),
          ...listing.images,
          ...viaJina.images,
        ]),
      ).slice(0, 60);

      listing = {
        ...listing,
        url: viaJina.sourceUrl || listing.url,
        title: viaJina.title ?? listing.title,
        titleKo: listing.titleKo ?? shareTitle,
        priceText: viaJina.priceText ?? listing.priceText,
        priceCny: viaJina.priceCny ?? listing.priceCny,
        attributes:
          viaJina.attributes.length > 0 ? viaJina.attributes : listing.attributes,
        images: mergedImages,
        rawImageCount: mergedImages.length,
        scrapeWarning: undefined,
      };
      if (!listing.title && shareTitle) listing.title = shareTitle;
      if (mergedImages.length > 0) return listing;
    }
  }

  if (listing.images.length === 0) {
    listing.scrapeWarning = blocked
      ? "1688이 해외 서버 접근을 막아 상품 사진을 자동으로 가져오지 못했습니다. 아래에서 제목·가격을 확인하고, 1688 앱/페이지의 상품 사진을 직접 추가한 뒤 매칭하세요."
      : "상품 갤러리 이미지를 찾지 못했습니다. 상품 사진을 직접 추가한 뒤 매칭하세요.";
    listing.rawImageCount = 0;
    return listing;
  }

  return listing;
}
