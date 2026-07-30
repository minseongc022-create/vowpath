import { upgradeCdnUrl, isLikelyProductImage, dedupeImages } from "./extract-images";
import type { ListingAttribute, ListingImage } from "./types";

const JINA_TIMEOUT_MS = 45_000;

export type Jina1688Result = {
  title?: string;
  priceText?: string;
  priceCny?: number;
  attributes: ListingAttribute[];
  images: ListingImage[];
  sourceUrl: string;
};

function cleanJinaImageUrl(raw: string): string {
  let u = raw.trim();
  // markdown trailing junk: ...)t**4
  u = u.replace(/\)[a-zA-Z0-9*._-]*$/g, "");
  u = u.replace(/http:\/\//i, "https://");
  u = u.replace(/\.jpg_\.webp$/i, ".jpg");
  u = u.replace(/\.png_\.webp$/i, ".png");
  u = u.replace(/_\.webp$/i, "");
  u = u.replace(/_sum\.jpg$/i, ".jpg");
  return upgradeCdnUrl(u);
}

function parseMarkdownAttributes(text: string): ListingAttribute[] {
  const attrs: ListingAttribute[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(/\|\s*([^|\n]{1,40}?)\s*\|\s*([^|\n]{1,80}?)\s*\|/g)) {
    const name = m[1]!.trim();
    const value = m[2]!.trim();
    if (!name || !value) continue;
    if (/^-+$/.test(name) || /^-+$/.test(value)) continue;
    if (/^brand$/i.test(name) && attrs.length === 0) {
      // keep Brand rows
    }
    if (/markdown|http|image|disclaimer|price under/i.test(name)) continue;
    if (/markdown|http|disclaimer/i.test(value)) continue;
    const key = `${name}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    attrs.push({ name, value });
    if (attrs.length >= 20) break;
  }
  return attrs;
}

function parsePrice(text: string): { priceText?: string; priceCny?: number } {
  const patterns = [
    /Price for 1 piece\*+\s*￥\*+\s*([0-9.]+)/i,
    /Price for 1 piece[\s\S]{0,40}?([0-9]+(?:\.[0-9]+)?)/i,
    /￥\s*([0-9]+(?:\.[0-9]+)?)/,
    /¥\s*([0-9]+(?:\.[0-9]+)?)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0 || n > 100000) continue;
    return { priceText: `¥${m[1]}`, priceCny: n };
  }
  return {};
}

/**
 * When 1688 geo-blocks cloud IPs, Jina's reader can still reach http detail pages
 * and return title / price / gallery image URLs.
 */
export async function fetch1688ViaJina(offerId: string): Promise<Jina1688Result | null> {
  const detailHttp = `http://detail.1688.com/offer/${offerId}.html`;
  const jinaUrl = `https://r.jina.ai/${detailHttp}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);
  try {
    const res = await fetch(jinaUrl, {
      headers: {
        "User-Agent": "MatchCut/1.0 (+https://matchcut.kr)",
        Accept: "text/plain",
        "X-With-Images-Summary": "true",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 200) return null;
    if (/Access denied|Captcha Interception|cloud_ip_bl/i.test(text) && !/ibank/i.test(text)) {
      return null;
    }

    let title: string | undefined;
    const titleLine = text.match(/^Title:\s*(.+)$/m);
    if (titleLine?.[1]) {
      title = titleLine[1]
        .replace(/\s*-\s*阿里巴巴\s*$/u, "")
        .replace(/\s*-\s*Alibaba\s*$/i, "")
        .trim();
    }

    const { priceText, priceCny } = parsePrice(text);
    const attributes = parseMarkdownAttributes(text);

    const rawUrls = [
      ...text.matchAll(
        /https?:\/\/cbu01\.alicdn\.com\/img\/ibank\/[^)\]\s"'<>]+/gi,
      ),
    ].map((m) => cleanJinaImageUrl(m[0]));

    const images: ListingImage[] = dedupeImages(
      rawUrls
        .filter(isLikelyProductImage)
        .map((url) => ({ url, source: "gallery" as const })),
    ).slice(0, 40);

    if (!title && images.length === 0) return null;

    return {
      title,
      priceText,
      priceCny,
      attributes,
      images,
      sourceUrl: `https://detail.1688.com/offer/${offerId}.html`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
