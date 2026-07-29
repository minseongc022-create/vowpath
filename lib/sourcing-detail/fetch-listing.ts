import { detectPlatform, normalizeListingUrl } from "./platforms";
import {
  dedupeImages,
  extractImageUrlsFromHtml,
  extractSkuOptionsFromHtml,
  toListingImages,
} from "./extract-images";
import type { ScrapedListing } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 25_000;

function extractTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeHtmlEntities(og[1].trim());

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) return decodeHtmlEntities(title[1].trim());

  const jsonTitle = html.match(/"subject"\s*:\s*"([^"]+)"/i);
  if (jsonTitle?.[1]) return decodeHtmlEntities(jsonTitle[1].trim());

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

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
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

/** Optional Playwright scrape when static fetch returns thin HTML. */
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
      await page.waitForTimeout(1500);
      return await page.content();
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

export async function scrapeListing(url: string): Promise<ScrapedListing> {
  const normalized = normalizeListingUrl(url);
  const platform = detectPlatform(normalized);

  let html = await fetchHtml(normalized);
  let imageUrls = extractImageUrlsFromHtml(html);

  if (imageUrls.length < 3) {
    const playwrightHtml = await fetchHtmlWithPlaywright(normalized);
    if (playwrightHtml) {
      html = playwrightHtml;
      imageUrls = extractImageUrlsFromHtml(html);
    }
  }

  const skuOptions = extractSkuOptionsFromHtml(html);
  const skuImages = skuOptions
    .map((s) => s.imageUrl)
    .filter((u): u is string => Boolean(u));

  const allUrls = [...imageUrls, ...skuImages];
  const images = dedupeImages(toListingImages(allUrls)).slice(0, 80);

  return {
    platform,
    url: normalized,
    title: extractTitle(html),
    images,
    skuOptions,
    rawImageCount: allUrls.length,
  };
}
