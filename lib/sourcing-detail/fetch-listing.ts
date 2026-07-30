import { detectPlatform, normalizeListingUrl } from "./platforms";
import {
  dedupeImages,
  extract1688OfferId,
  extractImageUrlsFromHtml,
  extractSkuOptionsFromHtml,
  parse1688OfferData,
  to1688DetailUrl,
  to1688FactoryCardUrl,
  to1688MobileUrl,
  toListingImages,
} from "./extract-images";
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
    if (!/访问被拒绝|denied|403/i.test(t)) return t;
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

async function fetchHtml(url: string, mobile = false): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": mobile ? MOBILE_UA : USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
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
  try {
    return await fetchHtml(url, mobile);
  } catch {
    return "";
  }
}

function merge1688Parse(html: string, base: ScrapedListing): ScrapedListing {
  const parsed = parse1688OfferData(html);
  const genericImages = dedupeImages(toListingImages(extractImageUrlsFromHtml(html)));
  const genericSkus = extractSkuOptionsFromHtml(html);

  const images = dedupeImages([
    ...parsed.images,
    ...base.images,
    ...genericImages,
  ]).slice(0, 100);

  const skuMap = new Map<string, (typeof parsed.skuOptions)[0]>();
  for (const s of [...parsed.skuOptions, ...genericSkus, ...base.skuOptions]) {
    skuMap.set(`${s.id}:${s.imageUrl ?? ""}`, s);
  }

  return {
    ...base,
    title: parsed.title ?? base.title,
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

export async function scrapeListing(url: string): Promise<ScrapedListing> {
  const normalizedInput = normalizeListingUrl(url);
  const platform = detectPlatform(normalizedInput);

  let canonicalUrl = normalizedInput;
  let htmlParts: string[] = [];
  let imageUrls: string[] = [];

  if (platform === "1688") {
    const { offerId, htmlHint } = await resolve1688OfferId(normalizedInput);
    if (htmlHint) htmlParts.push(htmlHint);

    if (offerId) {
      canonicalUrl = to1688DetailUrl(offerId);

      // Primary: factory card page often returns gallery even when detail is geo-blocked
      const cardHtml = await fetchHtmlSafe(to1688FactoryCardUrl(offerId));
      if (cardHtml) {
        htmlParts.push(cardHtml);
        imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(cardHtml)];
      }

      // Secondary: mobile + desktop shells (sometimes still have JSON)
      const mobileHtml = await fetchHtmlSafe(to1688MobileUrl(canonicalUrl) ?? "", true);
      if (mobileHtml) {
        htmlParts.push(mobileHtml);
        imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(mobileHtml)];
      }
      const deskHtml = await fetchHtmlSafe(canonicalUrl);
      if (deskHtml) {
        htmlParts.push(deskHtml);
        imageUrls = [...imageUrls, ...extractImageUrlsFromHtml(deskHtml)];
      }
    } else {
      const html = await fetchHtmlSafe(normalizedInput);
      htmlParts.push(html);
      imageUrls = extractImageUrlsFromHtml(html);
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
          await page.goto(normalizedInput, { waitUntil: "domcontentloaded", timeout: FETCH_TIMEOUT_MS });
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
    images: dedupeImages(toListingImages(allUrls)).slice(0, 80),
    skuOptions,
    rawImageCount: allUrls.length,
  };

  if (platform === "1688") {
    listing = merge1688Parse(html, listing);
  }

  if (listing.images.length === 0) {
    throw new Error(
      "LISTING_IMAGES_EMPTY — 1688 상품 이미지를 가져오지 못했습니다. 잠시 후 다시 시도하거나 detail.1688.com 상품 링크를 직접 넣어 주세요.",
    );
  }

  return listing;
}
