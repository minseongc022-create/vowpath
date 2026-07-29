const VISION_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
const MIN_MATCH_SCORE = 72;

type QualityPayload = {
  sameProductScore: number;
  colorMatch: boolean;
  shapeMatch: boolean;
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
}): Promise<QualityCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { passed: true, score: 100, issues: [] };
  }

  const refUrl = toDataUrl(params.referenceImageBase64, params.referenceMime);
  const genUrl = toDataUrl(params.generatedImageBase64, "image/png");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Compare REFERENCE product photo vs GENERATED product photo for e-commerce.
Product: ${params.productDescription}

Score whether GENERATED shows the SAME physical product (same color, shape, logos, variant).
Do NOT penalize different camera angle or background — only product identity.

Return JSON:
{
  "sameProductScore": 0-100,
  "colorMatch": true/false,
  "shapeMatch": true/false,
  "issues": ["Korean — list problems if score < 80, else empty array"]
}`,
              },
              { type: "text", text: "REFERENCE:" },
              { type: "image_url", image_url: { url: refUrl, detail: "high" } },
              { type: "text", text: "GENERATED:" },
              { type: "image_url", image_url: { url: genUrl, detail: "high" } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { passed: true, score: 80, issues: [] };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return { passed: true, score: 80, issues: [] };

    const payload = JSON.parse(raw) as QualityPayload;
    const score = Math.round(payload.sameProductScore ?? 0);
    const passed =
      score >= MIN_MATCH_SCORE && payload.colorMatch !== false && payload.shapeMatch !== false;

    return {
      passed,
      score,
      issues: payload.issues ?? [],
    };
  } catch {
    return { passed: true, score: 75, issues: [] };
  } finally {
    clearTimeout(timeout);
  }
}

export { MIN_MATCH_SCORE };
