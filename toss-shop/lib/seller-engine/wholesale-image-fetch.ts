/**
 * 도매꾹·도매매·1688 등 공급처에서 상품 이미지 URL 수집
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi,
    /data-src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi,
    /src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const u = decodeHtml(m[1].trim());
      if (u.startsWith("http") && !u.includes("logo") && !u.includes("icon")) {
        urls.push(u);
      }
    }
  }
  return [...new Set(urls)];
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchWholesaleProductImages(input: {
  productUrl?: string;
  primaryImageUrl?: string;
  maxImages?: number;
}): Promise<string[]> {
  const max = input.maxImages ?? 8;
  const collected: string[] = [];

  if (input.primaryImageUrl?.startsWith("http")) {
    collected.push(input.primaryImageUrl);
  }

  if (input.productUrl?.startsWith("http")) {
    const html = await fetchHtml(input.productUrl);
    if (html) {
      collected.push(...extractImageUrls(html));
    }
  }

  const unique = [...new Set(collected)].slice(0, max);
  if (unique.length === 0 && input.primaryImageUrl) {
    return [input.primaryImageUrl];
  }
  return unique;
}

export async function fetchUrlAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("base64");
  } catch {
    return null;
  }
}
