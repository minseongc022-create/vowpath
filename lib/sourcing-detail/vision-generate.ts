import { verifyGeneratedImage } from "./vision-quality";
import { countSuccessfulAngles } from "./angle-utils";
import type { GeneratedAngle } from "./types";

const ANGLE_SPECS: { angle: string; promptSuffix: string }[] = [
  {
    angle: "front",
    promptSuffix:
      "straight-on front view, centered product, soft studio lighting, pure white background, ecommerce product photography, sharp focus, no watermark",
  },
  {
    angle: "45-degree",
    promptSuffix:
      "45-degree angle hero shot, subtle shadow, clean white background, professional product photo, high detail, no text overlay",
  },
  {
    angle: "side",
    promptSuffix:
      "perfect side profile view, studio lighting, minimal shadow, white background, crisp commercial product image",
  },
  {
    angle: "detail",
    promptSuffix:
      "close-up detail shot showing material texture and key features, macro product photography, white background",
  },
  {
    angle: "lifestyle",
    promptSuffix:
      "clean lifestyle context — minimal modern surface, natural soft daylight, product unchanged, premium catalog style",
  },
];

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
const MAX_RETRIES = 2;

function buildPrompt(
  productDescription: string,
  promptSuffix: string,
  retryHint?: string,
): string {
  const strict =
    "CRITICAL: Keep IDENTICAL product — same exact color, shape, logos, hardware, pattern, and variant. Only change camera angle and lighting. Photorealistic studio shot.";
  const hint = retryHint ? ` Fix previous issues: ${retryHint}.` : "";
  return `${strict} Product: ${productDescription}. ${promptSuffix}.${hint} No watermark, no text, no collage.`;
}

async function callImageEdit(params: {
  refDataUrl: string;
  mime: string;
  prompt: string;
}): Promise<{ b64?: string; url?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const form = new FormData();
  const base64Data = params.refDataUrl.split(",")[1] ?? "";
  const bytes = Buffer.from(base64Data, "base64");
  const blob = new Blob([bytes], { type: params.mime });
  form.append("image", blob, "reference.jpg");
  form.append("prompt", params.prompt);
  form.append("model", IMAGE_MODEL);
  form.append("n", "1");
  form.append("size", "1024x1024");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const genRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: params.prompt,
        n: 1,
        size: "1024x1024",
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!genRes.ok) {
      return { error: `IMAGE_GEN_FAILED_${genRes.status}` };
    }
    const genData = (await genRes.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const item = genData.data?.[0];
    return { b64: item?.b64_json, url: item?.url };
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = data.data?.[0];
  return { b64: item?.b64_json, url: item?.url };
}

async function resolveBase64(result: { b64?: string; url?: string }): Promise<string | null> {
  if (result.b64) return result.b64;
  if (!result.url) return null;
  try {
    const res = await fetch(result.url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return null;
  }
}

async function generateOneAngle(params: {
  productDescription: string;
  referenceImageBase64: string;
  userReferenceBase64?: string;
  referenceMime?: string;
  angle: string;
  promptSuffix: string;
}): Promise<GeneratedAngle> {
  const mime = params.referenceMime ?? "image/jpeg";
  const refForEdit = params.referenceImageBase64.startsWith("data:")
    ? params.referenceImageBase64
    : `data:${mime};base64,${params.referenceImageBase64}`;

  const qualityRef = params.userReferenceBase64 ?? params.referenceImageBase64;

  let lastError: string | undefined;
  let retryHint: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = buildPrompt(params.productDescription, params.promptSuffix, retryHint);

    try {
      const result = await callImageEdit({ refDataUrl: refForEdit, mime, prompt });
      if (result.error) {
        lastError = result.error;
        continue;
      }

      const generatedB64 = await resolveBase64(result);
      if (!generatedB64) {
        lastError = "IMAGE_EMPTY";
        continue;
      }

      const quality = await verifyGeneratedImage({
        referenceImageBase64: qualityRef,
        referenceMime: params.referenceMime,
        generatedImageBase64: generatedB64,
        productDescription: params.productDescription,
      });

      if (quality.passed || attempt === MAX_RETRIES) {
        return {
          angle: params.angle,
          prompt,
          imageBase64: generatedB64,
          imageUrl: result.url,
          qualityScore: quality.score,
          retryCount: attempt,
          ...(quality.passed ? {} : { error: quality.issues[0] ?? "QUALITY_BELOW_THRESHOLD" }),
        };
      }

      retryHint = quality.issues.join("; ") || "색상/형태 불일치";
    } catch (e) {
      lastError = e instanceof Error ? e.message : "IMAGE_GEN_ERROR";
    }
  }

  return {
    angle: params.angle,
    prompt: buildPrompt(params.productDescription, params.promptSuffix),
    error: lastError ?? "IMAGE_GEN_FAILED",
    retryCount: MAX_RETRIES,
  };
}

export async function generateProductAngles(params: {
  productDescription: string;
  referenceImageBase64: string;
  userReferenceBase64?: string;
  referenceMime?: string;
  maxAngles?: number;
}): Promise<GeneratedAngle[]> {
  const specs = ANGLE_SPECS.slice(0, params.maxAngles ?? ANGLE_SPECS.length);
  const results: GeneratedAngle[] = [];

  for (const spec of specs) {
    const result = await generateOneAngle({
      productDescription: params.productDescription,
      referenceImageBase64: params.referenceImageBase64,
      userReferenceBase64: params.userReferenceBase64,
      referenceMime: params.referenceMime,
      angle: spec.angle,
      promptSuffix: spec.promptSuffix,
    });
    results.push(result);
  }

  return results;
}

export { countSuccessfulAngles } from "./angle-utils";
