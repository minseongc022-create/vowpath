import { openAiJsonCompletion } from "../openai-json";
import type { ListingImage, MatchCandidate, MatchResult, SkuOption } from "./types";

const VISION_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
const MAX_CANDIDATES = 24;

type VisionMatchPayload = {
  referenceDescription: string;
  rankings: {
    index: number;
    score: number;
    reason: string;
    skuLabel?: string;
  }[];
};

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SourcingDetail/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildCandidateList(
  images: ListingImage[],
  skuOptions: SkuOption[],
): { index: number; imageUrl: string; skuId?: string; skuLabel?: string }[] {
  const candidates: { index: number; imageUrl: string; skuId?: string; skuLabel?: string }[] = [];
  let idx = 0;

  for (const sku of skuOptions) {
    if (!sku.imageUrl) continue;
    candidates.push({
      index: idx++,
      imageUrl: sku.imageUrl,
      skuId: sku.id,
      skuLabel: sku.label,
    });
    if (candidates.length >= MAX_CANDIDATES) return candidates;
  }

  for (const img of images) {
    if (candidates.some((c) => c.imageUrl === img.url)) continue;
    candidates.push({ index: idx++, imageUrl: img.url });
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  return candidates;
}

export async function matchReferenceToListing(params: {
  referenceImageBase64: string;
  referenceMime?: string;
  images: ListingImage[];
  skuOptions: SkuOption[];
  title?: string;
}): Promise<MatchResult> {
  const mime = params.referenceMime ?? "image/jpeg";
  const refDataUrl = params.referenceImageBase64.startsWith("data:")
    ? params.referenceImageBase64
    : `data:${mime};base64,${params.referenceImageBase64}`;

  const candidates = buildCandidateList(params.images, params.skuOptions);
  if (candidates.length === 0) {
    return {
      bestMatch: null,
      candidates: [],
      referenceDescription: "후보 이미지를 찾지 못했습니다.",
    };
  }

  const thumbDataUrls: { index: number; dataUrl: string }[] = [];
  for (const c of candidates.slice(0, 12)) {
    const dataUrl = await fetchImageAsDataUrl(c.imageUrl);
    if (dataUrl) thumbDataUrls.push({ index: c.index, dataUrl });
  }

  const candidateLines = candidates
    .map((c) =>
      `[${c.index}] ${c.skuLabel ? `SKU: ${c.skuLabel}` : "gallery"} — ${c.imageUrl}`,
    )
    .join("\n");

  const content: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = [
    {
      type: "text",
      text: `You are matching a seller's REAL product photo to images scraped from a Chinese wholesale listing (1688/Taobao).
The listing gallery often shows WRONG variants (color, model, angle). Find the listing image that shows the SAME physical product as the reference photo.

Product title: ${params.title ?? "unknown"}

Candidate images (index → metadata):
${candidateLines}

Return JSON:
{
  "referenceDescription": "short Korean description of the reference product (color, shape, material, logos)",
  "rankings": [
    { "index": 0, "score": 0-100, "reason": "Korean — why match or not", "skuLabel": "optional" }
  ]
}

Score 90+ only when same SKU/variant (color, pattern, hardware). Penalize wrong color or different model shape.
Include at least the top 5 candidates in rankings, sorted by score descending.`,
    },
    { type: "image_url", image_url: { url: refDataUrl, detail: "high" } },
  ];

  for (const thumb of thumbDataUrls.slice(0, 8)) {
    content.push({
      type: "text",
      text: `Candidate index ${thumb.index}:`,
    });
    content.push({
      type: "image_url",
      image_url: { url: thumb.dataUrl, detail: "low" },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let payload: VisionMatchPayload;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`OPENAI_VISION_FAILED_${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("OPENAI_EMPTY_RESPONSE");
    payload = JSON.parse(raw) as VisionMatchPayload;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("OPENAI_TIMEOUT");
    // Fallback: text-only ranking via URLs when vision batch fails.
    payload = await openAiJsonCompletion<VisionMatchPayload>({
      system:
        "Rank listing image URLs against seller reference metadata. Return JSON with referenceDescription and rankings array.",
      user: `Reference vision batch failed. Rank by URL patterns and SKU labels only (lower confidence).\n${candidateLines}`,
      temperature: 0.2,
    });
    payload.referenceDescription =
      payload.referenceDescription ?? "비전 분석 실패 — URL 휴리스틱 매칭";
    for (const r of payload.rankings ?? []) {
      r.score = Math.min(r.score, 60);
    }
  } finally {
    clearTimeout(timeout);
  }

  const ranked: MatchCandidate[] = [];
  for (const r of payload.rankings ?? []) {
    const c = candidates.find((x) => x.index === r.index);
    if (!c) continue;
    ranked.push({
      imageUrl: c.imageUrl,
      skuId: c.skuId,
      skuLabel: r.skuLabel ?? c.skuLabel,
      score: r.score,
      reason: r.reason,
    });
  }
  ranked.sort((a, b) => b.score - a.score);

  return {
    bestMatch: ranked[0] ?? null,
    candidates: ranked,
    referenceDescription: payload.referenceDescription ?? "",
  };
}
