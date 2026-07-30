import { verifyGeneratedImage } from "./vision-quality";
import { countSuccessfulAngles } from "./angle-utils";
import { identityLockPrompt, type ProductIdentity } from "./product-identity";
import type { GeneratedAngle } from "./types";

const ANGLE_SPECS: { angle: string; promptSuffix: string }[] = [
  {
    angle: "front",
    promptSuffix:
      "Change ONLY camera to straight-on front view. Soft studio lighting, pure white background, ecommerce product photography, sharp focus.",
  },
  {
    angle: "45-degree",
    promptSuffix:
      "Change ONLY camera to a 45-degree hero angle. Subtle shadow, clean white background, professional product photo.",
  },
  {
    angle: "side",
    promptSuffix:
      "Change ONLY camera to a perfect side profile. Studio lighting, minimal shadow, white background.",
  },
  {
    angle: "detail",
    promptSuffix:
      "Change ONLY camera to a close-up of the same product's real material/hardware details already visible — do not invent new features. White background.",
  },
  {
    angle: "lifestyle",
    promptSuffix:
      "Keep the EXACT same product; place on a minimal modern surface with soft daylight. Do not alter the product itself.",
  },
];

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
const MAX_RETRIES = 1;
const INPUT_FIDELITY = process.env.OPENAI_IMAGE_INPUT_FIDELITY ?? "high";
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? "medium";

function buildPrompt(params: {
  identity: ProductIdentity;
  productDescription: string;
  promptSuffix: string;
  retryHint?: string;
}): string {
  const lock = identityLockPrompt(params.identity);
  const hint = params.retryHint
    ? ` PREVIOUS OUTPUT FAILED QA — fix: ${params.retryHint}.`
    : "";

  return [
    "TASK: Rephotograph the SAME physical product from a different camera angle.",
    "FORBIDDEN: redesign, recolor, restyle, invent logos, invent patterns, invent hardware, invent internal parts, change variant.",
    "ALLOWED: camera angle, framing, studio lighting, clean background.",
    `IDENTITY LOCK: ${lock}`,
    `Product label: ${params.productDescription}`,
    params.promptSuffix,
    "Photorealistic. No watermark, no text overlay, no collage, no collage edges.",
    hint,
  ]
    .filter(Boolean)
    .join(" ");
}

function toBytes(base64OrDataUrl: string): { bytes: Buffer; mime: string } {
  if (base64OrDataUrl.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(base64OrDataUrl);
    if (!match) throw new Error("INVALID_DATA_URL");
    return { bytes: Buffer.from(match[2], "base64"), mime: match[1] };
  }
  return { bytes: Buffer.from(base64OrDataUrl, "base64"), mime: "image/jpeg" };
}

/**
 * Image edits with high input fidelity.
 * First image = seller real photo (ground truth). Optional second = matched listing SKU.
 * Never falls back to text-only generations (those invent product details).
 */
async function callImageEdit(params: {
  primaryImageBase64: string;
  primaryMime?: string;
  secondaryImageBase64?: string;
  secondaryMime?: string;
  prompt: string;
}): Promise<{ b64?: string; url?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const form = new FormData();
  const primary = toBytes(
    params.primaryImageBase64.startsWith("data:")
      ? params.primaryImageBase64
      : `data:${params.primaryMime ?? "image/jpeg"};base64,${params.primaryImageBase64}`,
  );
  form.append(
    "image",
    new Blob([new Uint8Array(primary.bytes)], { type: primary.mime }),
    "seller-real.jpg",
  );

  if (params.secondaryImageBase64) {
    const secondary = toBytes(
      params.secondaryImageBase64.startsWith("data:")
        ? params.secondaryImageBase64
        : `data:${params.secondaryMime ?? "image/jpeg"};base64,${params.secondaryImageBase64}`,
    );
    form.append(
      "image",
      new Blob([new Uint8Array(secondary.bytes)], { type: secondary.mime }),
      "listing-match.jpg",
    );
  }

  form.append("prompt", params.prompt);
  form.append("model", IMAGE_MODEL);
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", IMAGE_QUALITY);
  // Preserves logos/faces/fine details from input images (gpt-image-1 / 1.5)
  if (!IMAGE_MODEL.includes("gpt-image-2")) {
    form.append("input_fidelity", INPUT_FIDELITY);
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    // Retry once without optional params some accounts reject
    if (res.status === 400) {
      return callImageEditLegacy(params);
    }
    return { error: `IMAGE_EDIT_FAILED_${res.status}` };
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = data.data?.[0];
  return { b64: item?.b64_json, url: item?.url };
}

/** Fallback edit without quality/input_fidelity if the account rejects them */
async function callImageEditLegacy(params: {
  primaryImageBase64: string;
  primaryMime?: string;
  secondaryImageBase64?: string;
  secondaryMime?: string;
  prompt: string;
}): Promise<{ b64?: string; url?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const form = new FormData();
  const primary = toBytes(
    params.primaryImageBase64.startsWith("data:")
      ? params.primaryImageBase64
      : `data:${params.primaryMime ?? "image/jpeg"};base64,${params.primaryImageBase64}`,
  );
  form.append(
    "image",
    new Blob([new Uint8Array(primary.bytes)], { type: primary.mime }),
    "seller-real.jpg",
  );
  form.append("prompt", params.prompt);
  form.append("model", IMAGE_MODEL);
  form.append("n", "1");
  form.append("size", "1024x1024");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    return { error: `IMAGE_EDIT_FAILED_${res.status}` };
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
  identity: ProductIdentity;
  productDescription: string;
  /** Seller real photo — ground truth */
  userReferenceBase64: string;
  userReferenceMime?: string;
  /** Matched listing SKU image — secondary reference only */
  listingImageBase64?: string;
  angle: string;
  promptSuffix: string;
}): Promise<GeneratedAngle> {
  let lastError: string | undefined;
  let retryHint: string | undefined;
  let bestRejected: { b64: string; score: number; issues: string[] } | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = buildPrompt({
      identity: params.identity,
      productDescription: params.productDescription,
      promptSuffix: params.promptSuffix,
      retryHint,
    });

    try {
      const result = await callImageEdit({
        primaryImageBase64: params.userReferenceBase64,
        primaryMime: params.userReferenceMime,
        secondaryImageBase64: params.listingImageBase64,
        prompt,
      });

      if (result.error) {
        lastError = result.error;
        // If dual-ref failed, retry with user photo only
        if (params.listingImageBase64 && attempt === 0) {
          retryHint = "use seller photo only; preserve every design detail";
        }
        continue;
      }

      const generatedB64 = await resolveBase64(result);
      if (!generatedB64) {
        lastError = "IMAGE_EMPTY";
        continue;
      }

      const quality = await verifyGeneratedImage({
        referenceImageBase64: params.userReferenceBase64,
        referenceMime: params.userReferenceMime,
        generatedImageBase64: generatedB64,
        productDescription: params.productDescription,
        mustPreserve: params.identity.mustPreserve,
      });

      if (quality.passed) {
        return {
          angle: params.angle,
          prompt,
          imageBase64: generatedB64,
          imageUrl: result.url,
          qualityScore: quality.score,
          retryCount: attempt,
        };
      }

      if (!bestRejected || quality.score > bestRejected.score) {
        bestRejected = {
          b64: generatedB64,
          score: quality.score,
          issues: quality.issues,
        };
      }

      lastError = quality.issues[0] ?? "FIDELITY_REJECTED";
      retryHint = quality.issues.join("; ") || "색상·로고·패턴·하드웨어·내부 디테일 원본과 불일치";
    } catch (e) {
      lastError = e instanceof Error ? e.message : "IMAGE_GEN_ERROR";
    }
  }

  // Ship best attempt even if QA failed — studio "AI로 고치기" can repair
  if (bestRejected) {
    return {
      angle: params.angle,
      prompt: buildPrompt({
        identity: params.identity,
        productDescription: params.productDescription,
        promptSuffix: params.promptSuffix,
      }),
      imageBase64: bestRejected.b64,
      needsFix: true,
      issues: bestRejected.issues,
      error: lastError ?? "FIDELITY_NEEDS_FIX",
      qualityScore: bestRejected.score,
      retryCount: MAX_RETRIES,
    };
  }

  return {
    angle: params.angle,
    prompt: buildPrompt({
      identity: params.identity,
      productDescription: params.productDescription,
      promptSuffix: params.promptSuffix,
    }),
    error: lastError ?? "IMAGE_GEN_FAILED",
    retryCount: MAX_RETRIES,
  };
}

export async function generateProductAngles(params: {
  identity: ProductIdentity;
  productDescription: string;
  userReferenceBase64: string;
  userReferenceMime?: string;
  listingImageBase64?: string;
  maxAngles?: number;
}): Promise<GeneratedAngle[]> {
  const specs = ANGLE_SPECS.slice(0, params.maxAngles ?? ANGLE_SPECS.length);
  const results: GeneratedAngle[] = [];

  for (const spec of specs) {
    const result = await generateOneAngle({
      identity: params.identity,
      productDescription: params.productDescription,
      userReferenceBase64: params.userReferenceBase64,
      userReferenceMime: params.userReferenceMime,
      listingImageBase64: params.listingImageBase64,
      angle: spec.angle,
      promptSuffix: spec.promptSuffix,
    });
    results.push(result);
  }

  return results;
}

/**
 * User-driven AI repair: keep seller photo as ground truth, fix the weird angle image.
 */
export async function fixProductAngle(params: {
  userReferenceBase64: string;
  userReferenceMime?: string;
  brokenImageBase64: string;
  angle: string;
  userInstruction: string;
  productDescription?: string;
  mustPreserve?: string[];
}): Promise<GeneratedAngle> {
  const instruction = params.userInstruction.trim() || "원본 상품과 디자인을 완전히 같게 고쳐주세요";
  const prompt = [
    "Fix this product photo so it matches the seller REFERENCE product exactly.",
    "Keep the requested camera angle. Correct wrong color, logos, patterns, hardware, and invented details.",
    `User request (Korean OK): ${instruction}`,
    params.productDescription ? `Product: ${params.productDescription}` : "",
    params.mustPreserve?.length ? `Must preserve: ${params.mustPreserve.join("; ")}` : "",
    "Photorealistic ecommerce photo, white background unless lifestyle angle. No watermark.",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await callImageEdit({
    primaryImageBase64: params.userReferenceBase64,
    primaryMime: params.userReferenceMime,
    secondaryImageBase64: params.brokenImageBase64,
    prompt,
  });

  if (result.error) {
    return { angle: params.angle, prompt, error: result.error, needsFix: true };
  }

  const generatedB64 = await resolveBase64(result);
  if (!generatedB64) {
    return { angle: params.angle, prompt, error: "IMAGE_EMPTY", needsFix: true };
  }

  const quality = await verifyGeneratedImage({
    referenceImageBase64: params.userReferenceBase64,
    referenceMime: params.userReferenceMime,
    generatedImageBase64: generatedB64,
    productDescription: params.productDescription ?? instruction,
    mustPreserve: params.mustPreserve,
  });

  return {
    angle: params.angle,
    prompt,
    imageBase64: generatedB64,
    imageUrl: result.url,
    qualityScore: quality.score,
    needsFix: !quality.passed,
    issues: quality.issues,
    error: quality.passed ? undefined : quality.issues[0] ?? "FIDELITY_NEEDS_FIX",
    retryCount: 0,
  };
}

export { countSuccessfulAngles } from "./angle-utils";
