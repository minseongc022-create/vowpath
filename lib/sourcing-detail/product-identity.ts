/**
 * Product identity fingerprint extracted from the seller's real photo.
 * Used to lock design/details during angle generation.
 */

export type ProductIdentity = {
  /** Dense English lock string for image prompts */
  lockPromptEn: string;
  /** Korean summary for UI */
  summaryKo: string;
  color: string;
  shape: string;
  material: string;
  logosText: string[];
  patterns: string[];
  hardware: string[];
  internalDetails: string[];
  mustPreserve: string[];
};

type IdentityPayload = {
  summaryKo: string;
  color: string;
  shape: string;
  material: string;
  logosText: string[];
  patterns: string[];
  hardware: string[];
  internalDetails: string[];
  mustPreserve: string[];
  lockPromptEn: string;
};

function toDataUrl(base64: string, mime = "image/jpeg"): string {
  return base64.startsWith("data:") ? base64 : `data:${mime};base64,${base64}`;
}

export async function extractProductIdentity(params: {
  referenceImageBase64: string;
  referenceMime?: string;
  referenceDescription?: string;
}): Promise<ProductIdentity> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const refUrl = toDataUrl(params.referenceImageBase64, params.referenceMime);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a product identity lock for e-commerce photo generation.
Extract EVERY visible design detail from this REAL product photo so another model can recreate the EXACT same product from a different camera angle.

Prior description: ${params.referenceDescription ?? "none"}

Return JSON:
{
  "summaryKo": "한 줄 한국어 요약",
  "color": "exact colors / finishes",
  "shape": "overall silhouette and proportions",
  "material": "visible materials / textures",
  "logosText": ["exact text/logos/brand marks visible, or empty"],
  "patterns": ["prints, stitching, weave, engraving, graphics"],
  "hardware": ["buttons, zippers, screws, ports, hinges, straps"],
  "internalDetails": ["interior lining, compartments, PCB layout, print on inside, labels — if visible"],
  "mustPreserve": ["8-12 non-negotiable details that must stay identical"],
  "lockPromptEn": "one dense English paragraph locking color, shape, logos, patterns, hardware, internal details — NO camera angle words"
}

Be specific (e.g. "matte charcoal gray", "YKK silver zipper", "red stitching on left"). Do not invent unseen details.`,
              },
              { type: "image_url", image_url: { url: refUrl, detail: "high" } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`IDENTITY_EXTRACT_FAILED_${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("IDENTITY_EXTRACT_EMPTY");

    const payload = JSON.parse(raw) as IdentityPayload;
    return normalizeIdentity(payload, params.referenceDescription);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("IDENTITY_EXTRACT_TIMEOUT");
    }
    // Minimal fallback — still lock on description text
    const fallback = params.referenceDescription?.trim() || "exact product from reference photo";
    return {
      lockPromptEn: `Identical product: ${fallback}. Preserve exact color, shape, logos, patterns, hardware, and all visible internal details.`,
      summaryKo: params.referenceDescription ?? "실사진 기준 상품",
      color: "as in reference",
      shape: "as in reference",
      material: "as in reference",
      logosText: [],
      patterns: [],
      hardware: [],
      internalDetails: [],
      mustPreserve: [fallback],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeIdentity(
  payload: IdentityPayload,
  fallbackDesc?: string,
): ProductIdentity {
  const mustPreserve = (payload.mustPreserve ?? []).filter(Boolean).slice(0, 14);
  const lockPromptEn =
    payload.lockPromptEn?.trim() ||
    [
      `Identical product: ${payload.summaryKo || fallbackDesc || "reference"}`,
      `Color: ${payload.color}`,
      `Shape: ${payload.shape}`,
      `Material: ${payload.material}`,
      payload.logosText?.length ? `Logos/text: ${payload.logosText.join(", ")}` : "",
      payload.patterns?.length ? `Patterns: ${payload.patterns.join(", ")}` : "",
      payload.hardware?.length ? `Hardware: ${payload.hardware.join(", ")}` : "",
      payload.internalDetails?.length
        ? `Internal details: ${payload.internalDetails.join(", ")}`
        : "",
      mustPreserve.length ? `Must preserve: ${mustPreserve.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join(". ");

  return {
    lockPromptEn,
    summaryKo: payload.summaryKo?.trim() || fallbackDesc || "실사진 기준 상품",
    color: payload.color ?? "",
    shape: payload.shape ?? "",
    material: payload.material ?? "",
    logosText: payload.logosText?.slice(0, 8) ?? [],
    patterns: payload.patterns?.slice(0, 8) ?? [],
    hardware: payload.hardware?.slice(0, 8) ?? [],
    internalDetails: payload.internalDetails?.slice(0, 8) ?? [],
    mustPreserve,
  };
}

export function identityLockPrompt(identity: ProductIdentity): string {
  const parts = [
    identity.lockPromptEn,
    identity.mustPreserve.length
      ? `NON-NEGOTIABLE: ${identity.mustPreserve.join("; ")}`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}
