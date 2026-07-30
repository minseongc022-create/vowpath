import { detectPlatform, normalizeListingUrl } from "./platforms";
import {
  dedupeImages,
  extractImageUrlsFromHtml,
  extractSkuOptionsFromHtml,
  parse1688OfferData,
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
  if (title?.[1]) return decodeHtmlEntities(title[1].trim());

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

async function fetchHtmlWithPlaywright(url: string): Promise<string | null> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({
        userAgent: USER_AGENT,
        locale: "zh-CN",
      });
      await page.goto(url, { waitUntil: "networkidle", timeout: FETCH_TIMEOUT_MS });
      await page.waitForTimeout(2000);
      return await page.content();
    } finally {
      await browser.close();
    }
  } catch {
    return null;
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

async function resolveRedirectUrl(url: string): Promise<string> {
  // qr.1688.com / short links → follow to real detail page
  if (!/qr\.1688\.com|s\.click\.|u\.1688\.com/i.test(url)) return url;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": MOBILE_UA, Accept: "text/html,*/*" },
        signal: controller.signal,
      });
      if (res.url && res.url !== url) return res.url;
      // Some pages embed offerId / detail link in HTML
      const html = await res.text();
      const detail =
        html.match(/https?:\/\/detail\.1688\.com\/offer\/\d+\.html/i)?.[0] ??
        html.match(/https?:\/\/m\.1688\.com\/offer\/\d+\.html/i)?.[0];
      if (detail) return detail;
      const offerId = html.match(/offerId["'\s:=]+(\d{6,})/i)?.[1];
      if (offerId) return `https://detail.1688.com/offer/${offerId}.html`;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    /* keep original */
  }
  return url;
}

export async function scrapeListing(url: string): Promise<ScrapedListing> {
  const normalized = await resolveRedirectUrl(normalizeListingUrl(url));
  const platform = detectPlatform(normalized);

  let html = await fetchHtml(normalized);
  let imageUrls = extractImageUrlsFromHtml(html);

  // 1688: try mobile page (often richer JSON for SKU images)
  if (platform === "1688" && imageUrls.length < 5) {
    const mobileUrl = to1688MobileUrl(normalized);
    if (mobileUrl) {
      try {
        const mobileHtml = await fetchHtml(mobileUrl, true);
        imageUrls = [...new Set([...imageUrls, ...extractImageUrlsFromHtml(mobileHtml)])];
        html = `${html}\n<!-- mobile -->\n${mobileHtml}`;
      } catch {
        /* mobile fallback optional */
      }
    }
  }

  if (imageUrls.length < 3) {
    const playwrightHtml = await fetchHtmlWithPlaywright(normalized);
    if (playwrightHtml) {
      html = `${html}\n<!-- pw -->\n${playwrightHtml}`;
      imageUrls = extractImageUrlsFromHtml(html);
    }
  }

  const skuOptions = extractSkuOptionsFromHtml(html);
  const skuImages = skuOptions
    .map((s) => s.imageUrl)
    .filter((u): u is string => Boolean(u));

  const allUrls = [...imageUrls, ...skuImages];
  let listing: ScrapedListing = {
    platform,
    url: normalized,
    title: extractTitle(html),
    images: dedupeImages(toListingImages(allUrls)).slice(0, 80),
    skuOptions,
    rawImageCount: allUrls.length,
  };

  if (platform === "1688") {
    listing = merge1688Parse(html, listing);
  }

  return listing;
}
