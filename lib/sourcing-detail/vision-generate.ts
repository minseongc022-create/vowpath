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

async function generateOneAngle(params: {
  productDescription: string;
  referenceImageBase64: string;
  referenceMime?: string;
  angle: string;
  promptSuffix: string;
}): Promise<GeneratedAngle> {
  const mime = params.referenceMime ?? "image/jpeg";
  const refDataUrl = params.referenceImageBase64.startsWith("data:")
    ? params.referenceImageBase64
    : `data:${mime};base64,${params.referenceImageBase64}`;

  const prompt = `Recreate the EXACT same product as the reference image: ${params.productDescription}. ${params.promptSuffix}. Do not change color, shape, logos, or variant. Photorealistic, looks newly shot not copied collage.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  try {
    // Image edits API — reference-guided generation when supported.
    const form = new FormData();
    const base64Data = refDataUrl.split(",")[1] ?? "";
    const bytes = Buffer.from(base64Data, "base64");
    const blob = new Blob([bytes], { type: mime });
    form.append("image", blob, "reference.jpg");
    form.append("prompt", prompt);
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
      // Fallback: generations with strong reference description.
      const genRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt: `Reference product (match exactly): ${params.productDescription}. ${params.promptSuffix}`,
          n: 1,
          size: "1024x1024",
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!genRes.ok) {
        return {
          angle: params.angle,
          prompt,
          error: `IMAGE_GEN_FAILED_${genRes.status}`,
        };
      }
      const genData = (await genRes.json()) as {
        data?: { b64_json?: string; url?: string }[];
      };
      const item = genData.data?.[0];
      return {
        angle: params.angle,
        prompt,
        imageBase64: item?.b64_json,
        imageUrl: item?.url,
      };
    }

    const data = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const item = data.data?.[0];
    return {
      angle: params.angle,
      prompt,
      imageBase64: item?.b64_json,
      imageUrl: item?.url,
    };
  } catch (e) {
    return {
      angle: params.angle,
      prompt,
      error: e instanceof Error ? e.message : "IMAGE_GEN_ERROR",
    };
  }
}

export async function generateProductAngles(params: {
  productDescription: string;
  referenceImageBase64: string;
  referenceMime?: string;
  maxAngles?: number;
}): Promise<GeneratedAngle[]> {
  const specs = ANGLE_SPECS.slice(0, params.maxAngles ?? ANGLE_SPECS.length);
  const results: GeneratedAngle[] = [];

  for (const spec of specs) {
    const result = await generateOneAngle({
      productDescription: params.productDescription,
      referenceImageBase64: params.referenceImageBase64,
      referenceMime: params.referenceMime,
      angle: spec.angle,
      promptSuffix: spec.promptSuffix,
    });
    results.push(result);
  }

  return results;
}
