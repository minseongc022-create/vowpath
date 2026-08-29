import { NextResponse } from "next/server";
import { generateHookableDetailPage, type ProductInput } from "@/hookable-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Partial<ProductInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const input: ProductInput = {
    name: body.name.trim(),
    category: body.category?.trim() || undefined,
    priceKrw: typeof body.priceKrw === "number" ? body.priceKrw : undefined,
    features: Array.isArray(body.features) ? body.features.filter(Boolean) : [],
    description: body.description?.trim() || undefined,
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.filter(Boolean) : [],
    keyword: body.keyword?.trim() || undefined,
    targetAudience: body.targetAudience?.trim() || undefined,
  };

  try {
    const result = await generateHookableDetailPage(input);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "generation failed" }, { status: 500 });
  }
}
