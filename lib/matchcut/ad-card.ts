import { openAiJsonCompletion } from "../openai-json";
import { AD_CARD_SPECS, type AdCardPlatform } from "./ad-card-specs";

export { AD_CARD_SPECS, type AdCardPlatform, type AdCardSpec } from "./ad-card-specs";

export type AdCardCopy = {
  headline: string;
  subcopy: string;
  cta: string;
  badge?: string;
};

export type GeneratedAdCard = {
  specId: string;
  label: string;
  width: number;
  height: number;
  copy: AdCardCopy;
  imageBase64?: string;
  error?: string;
};

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

function sizeForApi(width: number, height: number): "1024x1024" | "1536x1024" | "1024x1536" {
  const ratio = width / height;
  if (ratio > 1.2) return "1536x1024";
  if (ratio < 0.85) return "1024x1536";
  return "1024x1024";
}

export async function generateAdCardCopy(params: {
  productName: string;
  sellingPoints: string[];
  priceKrw?: number;
  platform: AdCardPlatform;
}): Promise<AdCardCopy> {
  const out = await openAiJsonCompletion<AdCardCopy>({
    system: `You write high-converting Korean ad card copy for ${params.platform}.
Rules: natural Korean, no false #1 claims, short punchy lines, no emoji spam.`,
    user: `Product: ${params.productName}
Points: ${params.sellingPoints.join(", ")}
Price: ${params.priceKrw ?? "미정"}
Return JSON: {"headline":"max 18 chars punchy","subcopy":"max 36 chars","cta":"짧은 CTA","badge":"optional short badge"}`,
    temperature: 0.4,
    timeoutMs: 20_000,
  });
  return {
    headline: out.headline?.trim() || params.productName.slice(0, 18),
    subcopy: out.subcopy?.trim() || "지금 확인하세요",
    cta: out.cta?.trim() || "구매하기",
    badge: out.badge?.trim(),
  };
}

async function editAdImage(params: {
  productImageBase64: string;
  mime?: string;
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536";
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
  form.append("size", params.size);
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

  if (!res.ok) return { error: `AD_IMAGE_FAILED_${res.status}` };
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  return { b64: data.data?.[0]?.b64_json };
}

export async function generateAdCards(params: {
  productName: string;
  productImageBase64: string;
  productMime?: string;
  sellingPoints?: string[];
  priceKrw?: number;
  specIds?: string[];
}): Promise<GeneratedAdCard[]> {
  const specs = AD_CARD_SPECS.filter((s) =>
    params.specIds?.length ? params.specIds.includes(s.id) : ["coupang_square", "naver_square"].includes(s.id),
  );

  const results: GeneratedAdCard[] = [];

  for (const spec of specs) {
    const copy = await generateAdCardCopy({
      productName: params.productName,
      sellingPoints: params.sellingPoints ?? [],
      priceKrw: params.priceKrw,
      platform: spec.platform,
    });

    const prompt = [
      "Create a HIGH-QUALITY Korean e-commerce AD CARD creative.",
      `Platform: ${spec.label} (${spec.width}x${spec.height}).`,
      "Keep the product from the reference image EXACT — same design, color, logos, details.",
      "Premium studio composition, clean gradient or soft lifestyle backdrop matching category.",
      "Add elegant Korean text overlays:",
      `Headline: ${copy.headline}`,
      `Sub: ${copy.subcopy}`,
      `CTA button text: ${copy.cta}`,
      copy.badge ? `Badge: ${copy.badge}` : "",
      "Typography: bold modern Korean sans, high contrast, no clutter, no watermark, no fake UI chrome.",
      "Looks like a real paid ad from a top seller — not a template collage.",
    ]
      .filter(Boolean)
      .join(" ");

    const img = await editAdImage({
      productImageBase64: params.productImageBase64,
      mime: params.productMime,
      prompt,
      size: sizeForApi(spec.width, spec.height),
    });

    results.push({
      specId: spec.id,
      label: spec.label,
      width: spec.width,
      height: spec.height,
      copy,
      imageBase64: img.b64,
      error: img.error,
    });
  }

  return results;
}
