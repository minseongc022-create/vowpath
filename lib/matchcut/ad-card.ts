import { openAiJsonCompletion } from "../openai-json";
import { AD_CARD_STYLES, adCardStyleById, type AdCardStyleId } from "./ad-card-specs";

export { AD_CARD_STYLES, type AdCardStyle, type AdCardStyleId } from "./ad-card-specs";

export type AdCardCopy = {
  headline: string;
  subcopy: string;
  cta: string;
  badge?: string;
};

export type GeneratedAdCard = {
  styleId: AdCardStyleId;
  label: string;
  copy: AdCardCopy;
  imageBase64?: string;
  error?: string;
};

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

export async function generateAdCardCopy(params: {
  productName: string;
  sellingPoints: string[];
  priceKrw?: number;
  styleId: AdCardStyleId;
}): Promise<AdCardCopy> {
  const style = adCardStyleById(params.styleId);
  const out = await openAiJsonCompletion<AdCardCopy>({
    system: `You are a senior Korean performance marketer writing ad-card copy like top Creazy/Draph-class tools — but sharper and more premium.
Rules:
- Natural native Korean (not translated)
- No false "#1", medical, KC claims
- No emoji spam
- Style: ${style?.label ?? params.styleId} — ${style?.description ?? ""}`,
    user: `Product: ${params.productName}
Selling points: ${params.sellingPoints.join(", ") || "없음"}
Price: ${params.priceKrw ?? "미정"}

Return JSON:
{
  "headline": "강한 한 줄 (12자 내외, 혜택/감정)",
  "subcopy": "보조 한 줄 (22자 내외)",
  "cta": "짧은 CTA",
  "badge": "선택 — 2~6자 뱃지"
}`,
    temperature: 0.45,
    timeoutMs: 20_000,
  });
  return {
    headline: out.headline?.trim() || params.productName.slice(0, 14),
    subcopy: out.subcopy?.trim() || "지금 바로 확인해보세요",
    cta: out.cta?.trim() || "자세히 보기",
    badge: out.badge?.trim(),
  };
}

async function editAdImage(params: {
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
  styleIds?: string[];
}): Promise<GeneratedAdCard[]> {
  const styles = AD_CARD_STYLES.filter((s) =>
    params.styleIds?.length
      ? params.styleIds.includes(s.id)
      : ["benefit_hero", "lifestyle_mood", "editorial_premium"].includes(s.id),
  );

  const results: GeneratedAdCard[] = [];

  for (const style of styles) {
    const copy = await generateAdCardCopy({
      productName: params.productName,
      sellingPoints: params.sellingPoints ?? [],
      priceKrw: params.priceKrw,
      styleId: style.id,
    });

    const prompt = [
      "Create a HIGH-END Korean marketing AD CARD (피드·광고·프로모션용 정사각 크리에이티브).",
      "This is NOT a boring marketplace size template — it should beat Creazy-class ad cards in taste and clarity.",
      `Style: ${style.label}. ${style.artDirection}`,
      "Keep the product from the reference image EXACT — same color, shape, logos, materials, details. Do not redesign the product.",
      "Korean text overlays (crisp, premium typography):",
      `Headline: ${copy.headline}`,
      `Subcopy: ${copy.subcopy}`,
      `CTA: ${copy.cta}`,
      copy.badge ? `Badge: ${copy.badge}` : "",
      "Composition: one clear hierarchy, product readable at glance, tasteful lighting, no watermark, no fake UI browser chrome, no cluttered sticker spam.",
    ]
      .filter(Boolean)
      .join(" ");

    const img = await editAdImage({
      productImageBase64: params.productImageBase64,
      mime: params.productMime,
      prompt,
    });

    results.push({
      styleId: style.id,
      label: style.label,
      copy,
      imageBase64: img.b64,
      error: img.error,
    });
  }

  return results;
}
