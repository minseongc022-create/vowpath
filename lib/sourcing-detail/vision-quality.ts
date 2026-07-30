const VISION_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
/** Fail closed: drifted design/details must not ship */
const MIN_MATCH_SCORE = 88;

type QualityPayload = {
  sameProductScore: number;
  colorMatch: boolean;
  shapeMatch: boolean;
  logoMatch: boolean;
  patternMatch: boolean;
  hardwareMatch: boolean;
  detailMatch: boolean;
  issues: string[];
};

export type QualityCheckResult = {
  passed: boolean;
  score: number;
  issues: string[];
};

function toDataUrl(base64: string, mime = "image/jpeg"): string {
  return base64.startsWith("data:") ? base64 : `data:${mime};base64,${base64}`;
}

export async function verifyGeneratedImage(params: {
  referenceImageBase64: string;
  referenceMime?: string;
  generatedImageBase64: string;
  productDescription: string;
  mustPreserve?: string[];
}): Promise<QualityCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Without vision we cannot certify fidelity — treat as failed so credits refund
    return { passed: false, score: 0, issues: ["OPENAI_API_KEY_MISSING"] };
  }

  const refUrl = toDataUrl(params.referenceImageBase64, params.referenceMime);
  const genUrl = toDataUrl(params.generatedImageBase64, "image/png");
  const mustList =
    params.mustPreserve && params.mustPreserve.length > 0
      ? params.mustPreserve.map((d, i) => `${i + 1}. ${d}`).join("\n")
      : "(use visible product identity)";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a STRICT product-fidelity QA for Korean e-commerce.
REFERENCE is the seller's real product. GENERATED must be the SAME physical product from another camera angle.

Product: ${params.productDescription}

Must-preserve details:
${mustList}

Score ONLY product identity. Different angle/background/lighting is OK.
Fail if color, shape, logos/text, patterns, hardware, or visible internal details drifted or were invented.

Return JSON:
{
  "sameProductScore": 0-100,
  "colorMatch": true/false,
  "shapeMatch": true/false,
  "logoMatch": true/false,
  "patternMatch": true/false,
  "hardwareMatch": true/false,
  "detailMatch": true/false,
  "issues": ["Korean — concrete mismatches; empty if score >= 90"]
}

logoMatch/patternMatch/hardwareMatch/detailMatch = true if that aspect is absent in BOTH images OR matches.
Score 90+ only when a buyer would recognize it as the identical SKU.`,
              },
              { type: "text", text: "REFERENCE (ground truth):" },
              { type: "image_url", image_url: { url: refUrl, detail: "high" } },
              { type: "text", text: "GENERATED (candidate):" },
              { type: "image_url", image_url: { url: genUrl, detail: "high" } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Fail closed — do not ship unverified images
      return { passed: false, score: 0, issues: [`QUALITY_CHECK_FAILED_${res.status}`] };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return { passed: false, score: 0, issues: ["QUALITY_CHECK_EMPTY"] };
    }

    const payload = JSON.parse(raw) as QualityPayload;
    const score = Math.round(payload.sameProductScore ?? 0);
    const flagsOk =
      payload.colorMatch !== false &&
      payload.shapeMatch !== false &&
      payload.logoMatch !== false &&
      payload.patternMatch !== false &&
      payload.hardwareMatch !== false &&
      payload.detailMatch !== false;

    const passed = score >= MIN_MATCH_SCORE && flagsOk;

    return {
      passed,
      score,
      issues: payload.issues?.length
        ? payload.issues
        : passed
          ? []
          : ["디자인·디테일이 원본과 다릅니다"],
    };
  } catch {
    return { passed: false, score: 0, issues: ["QUALITY_CHECK_ERROR"] };
  } finally {
    clearTimeout(timeout);
  }
}

export { MIN_MATCH_SCORE };
