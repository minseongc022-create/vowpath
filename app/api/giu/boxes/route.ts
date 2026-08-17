import { NextResponse } from "next/server";
import { z } from "zod";
import { isGiuCategory } from "@/giu/lib/categories";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { isAllowedGiuImageUrl } from "@/giu/lib/image-url";
import { MAX_BOX_IMAGES, normalizeImageUrls } from "@/giu/lib/box-images";
import { createBox, getMerchant, listBoxes, defaultPickupWindow } from "@/giu/lib/store";

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z
    .string()
    .max(500)
    .refine((v) => !v || isAllowedGiuImageUrl(v), "이미지 URL이 올바르지 않습니다")
    .optional(),
  imageUrls: z
    .array(
      z
        .string()
        .max(500)
        .refine((v) => isAllowedGiuImageUrl(v), "이미지 URL이 올바르지 않습니다"),
    )
    .max(MAX_BOX_IMAGES)
    .optional(),
  category: z.string().refine(isGiuCategory, "업종이 올바르지 않습니다").optional(),
  originalPriceVnd: z.number().int().min(500),
  salePriceVnd: z.number().int().min(500),
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
  const includeSoldOut = url.searchParams.get("sold") === "1";
  const when = url.searchParams.get("when");
  const dayOffset = when === "today" ? (0 as const) : when === "tomorrow" ? (1 as const) : undefined;

  if (merchantId) {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || session.merchantId !== merchantId) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }
  }

  const boxes = await listBoxes({
    district,
    category,
    merchantId,
    openOnly: openOnly && !includeSoldOut,
    includeSoldOut: includeSoldOut || undefined,
    dayOffset,
  });
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
      return NextResponse.json(
        { error: "판매가는 정가보다 낮아야 합니다" },
        { status: 400 },
      );
    }
    const pickupStart = parsed.data.pickupStart ?? defaultPickupWindow().start;
    const pickupEnd = parsed.data.pickupEnd ?? defaultPickupWindow().end;
    if (new Date(pickupEnd).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "픽업 종료 시간은 현재 이후여야 합니다" },
        { status: 400 },
      );
    }
    if (merchant.market === "kr") {
      if (parsed.data.originalPriceVnd < 1000 || parsed.data.salePriceVnd < 500) {
        return NextResponse.json({ error: "가격을 확인해 주세요" }, { status: 400 });
      }
    } else if (parsed.data.originalPriceVnd < 10000 || parsed.data.salePriceVnd < 5000) {
      return NextResponse.json({ error: "가격을 확인해 주세요" }, { status: 400 });
    }

    const urls = normalizeImageUrls(
      parsed.data.imageUrls?.length
        ? parsed.data.imageUrls
        : parsed.data.imageUrl
          ? [parsed.data.imageUrl]
          : [],
    );
    const imageUrl = urls[0];
    const imageUrls = urls.length ? urls : undefined;
    const box = await createBox({
      merchantId: merchant.id,
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl,
      imageUrls,
      category: parsed.data.category ?? merchant.category,
      originalPriceVnd: parsed.data.originalPriceVnd,
      salePriceVnd: parsed.data.salePriceVnd,
      quantityTotal: parsed.data.quantityTotal,
      pickupStart,
      pickupEnd,
      expiresAt: parsed.data.expiresAt ?? pickupEnd,
      freshnessNote:
        parsed.data.freshnessNote ??
        "픽업 시간까지 신선하게 보관합니다.",
    });
    return NextResponse.json({ box }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
