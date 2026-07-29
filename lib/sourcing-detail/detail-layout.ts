import type { GeneratedAngle, MatchResult, ScrapedListing } from "./types";

function imgSrc(angle: GeneratedAngle): string {
  if (angle.imageBase64) {
    return `data:image/png;base64,${angle.imageBase64}`;
  }
  if (angle.imageUrl) return angle.imageUrl;
  return "";
}

export function buildDetailPageHtml(params: {
  listing: ScrapedListing;
  match: MatchResult;
  angles: GeneratedAngle[];
}): string {
  const { listing, match, angles } = params;
  const title = listing.title ?? "상품 상세페이지";
  const desc = match.referenceDescription;
  const matchedUrl = match.bestMatch?.imageUrl;

  const angleBlocks = angles
    .filter((a) => imgSrc(a))
    .map(
      (a) =>
        `<section class="angle"><img src="${imgSrc(a)}" alt="${a.angle}" /><p class="cap">${a.angle}</p></section>`,
    )
    .join("\n");

  const skuNote = match.bestMatch?.skuLabel
    ? `<p class="sku">매칭 옵션: ${match.bestMatch.skuLabel} (신뢰도 ${match.bestMatch.score}%)</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #fafafa; color: #111; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { font-size: 1.5rem; line-height: 1.35; margin: 0 0 12px; }
    .desc { color: #444; font-size: 0.95rem; line-height: 1.6; margin-bottom: 8px; }
    .sku { color: #2563eb; font-size: 0.9rem; margin-bottom: 24px; }
    .hero { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .hero img { width: 100%; height: auto; border-radius: 8px; display: block; }
    .grid { display: grid; gap: 16px; }
    .angle { background: #fff; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .angle img { width: 100%; height: auto; border-radius: 8px; display: block; }
    .cap { text-align: center; font-size: 0.8rem; color: #666; margin: 8px 0 0; }
    .source { margin-top: 32px; font-size: 0.75rem; color: #999; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    <p class="desc">${escapeHtml(desc)}</p>
    ${skuNote}
    ${matchedUrl ? `<div class="hero"><img src="${matchedUrl}" alt="matched listing" /></div>` : ""}
    <div class="grid">${angleBlocks}</div>
    <p class="source">소싱 URL: ${escapeHtml(listing.url)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
