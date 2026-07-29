import { openAiJsonCompletion } from "../openai-json";

export type ProductCategory =
  | "fashion"
  | "electronics"
  | "home"
  | "beauty"
  | "sports"
  | "kids"
  | "food"
  | "accessories"
  | "generic";

export type ProductAnalysis = {
  category: ProductCategory;
  /** Naver Shopping 검색용 한국어 키워드 */
  searchQuery: string;
  productNameKo: string;
  keyFeatures: string[];
  targetAudience: string;
  sellingPoints: string[];
  detailStyle: "minimal" | "premium" | "value" | "technical";
};

type AnalysisPayload = {
  category: ProductCategory;
  searchQuery: string;
  productNameKo: string;
  keyFeatures: string[];
  targetAudience: string;
  sellingPoints: string[];
  detailStyle: ProductAnalysis["detailStyle"];
};

const VALID_CATEGORIES: ProductCategory[] = [
  "fashion",
  "electronics",
  "home",
  "beauty",
  "sports",
  "kids",
  "food",
  "accessories",
  "generic",
];

export async function analyzeProduct(params: {
  referenceImageBase64: string;
  referenceMime?: string;
  title?: string;
  referenceDescription?: string;
}): Promise<ProductAnalysis> {
  const mime = params.referenceMime ?? "image/jpeg";
  const refDataUrl = params.referenceImageBase64.startsWith("data:")
    ? params.referenceImageBase64
    : `data:${mime};base64,${params.referenceImageBase64}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You analyze import products for Korean e-commerce sellers (Coupang, Naver Smart Store).

Listing title: ${params.title ?? "unknown"}
Reference description: ${params.referenceDescription ?? "none"}

From the product photo, return JSON:
{
  "category": "fashion|electronics|home|beauty|sports|kids|food|accessories|generic",
  "searchQuery": "2-4 word Korean search query to find similar top sellers on Naver Shopping",
  "productNameKo": "natural Korean product name for listing",
  "keyFeatures": ["3-5 factual features visible or inferable"],
  "targetAudience": "one sentence Korean — who buys this",
  "sellingPoints": ["3-4 Korean hooks sellers should emphasize"],
  "detailStyle": "minimal|premium|value|technical"
}

searchQuery must be Korean, no brand names unless visible on product. Be specific (color, material, type).`,
              },
              { type: "image_url", image_url: { url: refDataUrl, detail: "high" } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`PRODUCT_ANALYSIS_FAILED_${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("PRODUCT_ANALYSIS_EMPTY");
    const payload = JSON.parse(raw) as AnalysisPayload;

    return {
      category: VALID_CATEGORIES.includes(payload.category) ? payload.category : "generic",
      searchQuery: payload.searchQuery?.trim() || params.title?.slice(0, 30) || "생활용품",
      productNameKo: payload.productNameKo?.trim() || params.title || "상품",
      keyFeatures: payload.keyFeatures?.slice(0, 6) ?? [],
      targetAudience: payload.targetAudience ?? "",
      sellingPoints: payload.sellingPoints?.slice(0, 5) ?? [],
      detailStyle: payload.detailStyle ?? "premium",
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("PRODUCT_ANALYSIS_TIMEOUT");
    // Text fallback when vision fails
    const fallback = await openAiJsonCompletion<AnalysisPayload>({
      system: "Analyze import product metadata for Korean e-commerce. Return JSON only.",
      user: `Title: ${params.title}\nDescription: ${params.referenceDescription}\nInfer category and Korean search query.`,
      temperature: 0.2,
    });
    return {
      category: VALID_CATEGORIES.includes(fallback.category) ? fallback.category : "generic",
      searchQuery: fallback.searchQuery?.trim() || "생활용품",
      productNameKo: fallback.productNameKo?.trim() || params.title || "상품",
      keyFeatures: fallback.keyFeatures?.slice(0, 6) ?? [],
      targetAudience: fallback.targetAudience ?? "",
      sellingPoints: fallback.sellingPoints?.slice(0, 5) ?? [],
      detailStyle: fallback.detailStyle ?? "premium",
    };
  } finally {
    clearTimeout(timeout);
  }
}
