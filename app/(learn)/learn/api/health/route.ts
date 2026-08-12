import { NextResponse } from "next/server";
import { isLearnOpenAiReady } from "@/learn/lib/openai-config";
import { LEARN_BRAND } from "@/learn/lib/brand";

export const dynamic = "force-dynamic";

export async function GET() {
  const openaiReady = isLearnOpenAiReady();
  return NextResponse.json({
    ok: openaiReady,
    product: LEARN_BRAND.productId,
    brand: LEARN_BRAND.name,
    isolated: true,
    timestamp: new Date().toISOString(),
    openai: { configured: openaiReady },
    features: {
      ingest: openaiReady,
      quiz: openaiReady,
      tutor: openaiReady,
    },
  });
}
