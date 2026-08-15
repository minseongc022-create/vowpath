import { NextResponse } from "next/server";
import { z } from "zod";
import { isGiuCategory } from "@/giu/lib/categories";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { isAllowedGiuImageUrl } from "@/giu/lib/image-url";
import { createBox, getMerchant, listBoxes, defaultPickupWindow } from "@/giu/lib/store";

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z
    .string()
    .max(500)
    .refine((v) => !v || isAllowedGiuImageUrl(v), "이미지 URL이 올바르지 않습니다")
    .optional(),
  category: z.string().refine(isGiuCategory, "업종이 올바르지 않습니다").optional(),
  originalPriceVnd: z.number().int().min(10000),
  salePriceVnd: z.number().int().min(5000),
  quantityTotal: z.number().int().min(1).max(50),
  freshnessNote: z.string().max(200).optional(),
  pickupStart: z.string().datetime().optional(),
  pickupEnd: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const district = url.searchParams.get("district") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const merchantId = url.searchParams.get("merchantId") ?? undefined;
  const openOnly = url.searchParams.get("openOnly") === "1";
  const boxes = await listBoxes({ district, category, merchantId, openOnly });
  return NextResponse.json({ boxes });
}

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const merchant = await getMerchant(session.merchantId);
    if (!merchant) {
      return NextResponse.json({ error: "가게를 찾을 수 없습니다" }, { status: 404 });
    }
    if (parsed.data.salePriceVnd >= parsed.data.originalPriceVnd) {
      return NextResponse.json({ error: "구출 가격은 정가보다 낮아야 합니다" }, { status: 400 });
    }

    const window = defaultPickupWindow();
    const imageUrl = parsed.data.imageUrl?.trim() || undefined;
    const box = await createBox({
      merchantId: merchant.id,
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl,
      category: parsed.data.category ?? merchant.category,
      originalPriceVnd: parsed.data.originalPriceVnd,
      salePriceVnd: parsed.data.salePriceVnd,
      quantityTotal: parsed.data.quantityTotal,
      pickupStart: parsed.data.pickupStart ?? window.start,
      pickupEnd: parsed.data.pickupEnd ?? window.end,
      expiresAt: parsed.data.expiresAt ?? window.expires,
      freshnessNote:
        parsed.data.freshnessNote ??
        "픽업 시간까지 신선하게 보관합니다.",
    });
    return NextResponse.json({ box }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
