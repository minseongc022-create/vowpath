import { openAiJsonCompletion } from "../openai-json";
import type { ProductAnalysis } from "./product-analysis";
import type { ProductIdentity } from "./product-identity";

export type ListingThumbnail = {
  concept: string;
  label: string;
  headline: string;
  imageBase64?: string;
  error?: string;
};

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

const THUMB_CONCEPTS = [
  {
    id: "clean_click",
    label: "클린 클릭",
    brief:
      "Pure white / soft studio background, product fills ~70% frame, one short Korean hook text in a clean typography band. Instantly readable in search grids.",
  },
  {
    id: "benefit_callout",
    label: "혜택 콜아웃",
    brief:
      "Same exact product, slightly dynamic angle, 1–2 short Korean benefit callouts as elegant labels (not noisy stickers). Conversion-focused marketplace thumbnail.",
  },
  {
    id: "lifestyle_crop",
    label: "라이프 크롭",
    brief:
      "Premium lifestyle crop matching category mood, product still exact and dominant, minimal Korean mood line. Looks expensive in a scroll feed.",
  },
] as const;

type ThumbCopyPayload = {
  headlines: { concept: string; headline: string }[];
};

async function editThumb(params: {
  productImageBase64: string;
  mime?: string;
  prompt: string;
}): Promise<{ b64?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY_MISSING" };

  const mime = params.mime ?? "image/jpeg";
  const dataUrl = params.productImageBase64.startsWith("data:")
    ? params.productImageBase64
    : `data:${mime};base64,${params.productImageBase64}`;
  const raw = dataUrl.split(",")[1] ?? "";
  const bytes = Buffer.from(raw, "base64");

  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(bytes)], { type: mime }), "product.jpg");
  form.append("prompt", params.prompt);
  form.append("model", IMAGE_MODEL);
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY ?? "high");
  if (!(process.env.OPENAI_IMAGE_MODEL ?? "").includes("gpt-image-2")) {
    form.append("input_fidelity", "high");
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) return { error: `THUMB_FAILED_${res.status}` };
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  return { b64: data.data?.[0]?.b64_json };
}

export async function generateListingThumbnails(params: {
  analysis: ProductAnalysis;
  identity?: ProductIdentity;
  productImageBase64: string;
  productMime?: string;
  sellingPoints?: string[];
  count?: number;
}): Promise<ListingThumbnail[]> {
  const count = Math.min(3, Math.max(1, params.count ?? 3));
  const concepts = THUMB_CONCEPTS.slice(0, count);

  let headlines: Record<string, string> = {};
  try {
    const payload = await openAiJsonCompletion<ThumbCopyPayload>({
      system:
        "Write short Korean marketplace thumbnail headlines (max 10 chars each). Premium, native, no false claims.",
      user: `Product: ${params.analysis.productNameKo}
Category: ${params.analysis.category}
Points: ${(params.sellingPoints ?? params.analysis.sellingPoints).join(", ")}
Concepts: ${concepts.map((c) => c.id).join(", ")}
Return {"headlines":[{"concept":"clean_click","headline":"..."},...]}`,
      temperature: 0.4,
      timeoutMs: 15_000,
    });
    for (const h of payload.headlines ?? []) {
      headlines[h.concept] = h.headline;
    }
  } catch {
    headlines = {
      clean_click: params.analysis.productNameKo.slice(0, 10),
      benefit_callout: params.analysis.sellingPoints[0]?.slice(0, 10) || "퀄리티 체크",
      lifestyle_crop: "오늘부터",
    };
  }

  const results: ListingThumbnail[] = [];
  for (const concept of concepts) {
    const headline = headlines[concept.id] || params.analysis.productNameKo.slice(0, 10);
    const lock = params.identity?.lockPromptEn
      ? `IDENTITY LOCK: ${params.identity.lockPromptEn}`
      : "Keep product EXACT from reference.";

    const prompt = [
      "Create a HIGH-CTR Korean marketplace LISTING THUMBNAIL (정사각).",
      "Most competitors skip auto thumbnails — make this clearly better than average seller thumbs.",
      concept.brief,
      lock,
      `Product: ${params.analysis.productNameKo}`,
      `Korean headline text on image: ${headline}`,
      "Exact product design/details. Sharp, bright, mobile-grid readable. No watermark, no fake UI.",
    ].join(" ");

    const img = await editThumb({
      productImageBase64: params.productImageBase64,
      mime: params.productMime,
      prompt,
    });

    results.push({
      concept: concept.id,
      label: concept.label,
      headline,
      imageBase64: img.b64,
      error: img.error,
    });
  }

  return results;
}
