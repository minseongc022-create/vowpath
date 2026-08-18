import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { isAllowedGiuImageUrl } from "@/giu/lib/image-url";
import { MAX_BOX_IMAGES, normalizeImageUrls } from "@/giu/lib/box-images";
import { deleteBox, getBox, getMerchant, updateBox } from "@/giu/lib/store";

const patchSchema = z.object({
  status: z.enum(["mo", "het", "huy"]).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional(),
  originalPriceVnd: z.number().int().min(500).max(10_000_000).optional(),
  salePriceVnd: z.number().int().min(500).max(10_000_000).optional(),
  quantityTotal: z.number().int().min(1).max(50).optional(),
  imageUrl: z
    .union([
      z.literal(""),
      z.string().max(500).refine((v) => isAllowedGiuImageUrl(v), "이미지 URL이 올바르지 않습니다"),
    ])
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
  freshnessNote: z.string().max(200).optional(),
  quantityLeft: z.number().int().min(0).max(50).optional(),
  pickupStart: z.string().datetime().optional(),
  pickupEnd: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const box = await getBox(id);
    if (!box) return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });

    const merchant = await getMerchant(session.merchantId);
    if (!merchant || box.merchantId !== merchant.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const { imageUrl, imageUrls, ...rest } = parsed.data;
    const nextOriginal = rest.originalPriceVnd ?? box.originalPriceVnd;
    const nextSale = rest.salePriceVnd ?? box.salePriceVnd;
    if (nextSale >= nextOriginal) {
      return NextResponse.json({ error: "판매가는 정가보다 낮아야 합니다" }, { status: 400 });
    }

    let imagePatch: { imageUrl?: string; imageUrls?: string[] } = {};
    if (imageUrls !== undefined) {
      const urls = normalizeImageUrls(imageUrls);
      imagePatch = urls.length
        ? { imageUrl: urls[0], imageUrls: urls }
        : { imageUrl: undefined, imageUrls: undefined };
    } else if (imageUrl !== undefined) {
      const trimmed = imageUrl.trim();
      imagePatch = trimmed
        ? { imageUrl: trimmed, imageUrls: [trimmed] }
        : { imageUrl: undefined, imageUrls: undefined };
    }

    const nextPickupEnd = rest.pickupEnd ?? box.pickupEnd;
    if (rest.pickupEnd && new Date(nextPickupEnd).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "픽업 종료 시간은 현재 이후여야 합니다" },
        { status: 400 },
      );
    }

    const updated = await updateBox(id, {
      ...rest,
      ...imagePatch,
    });
    return NextResponse.json({ box: updated });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const box = await getBox(id);
    if (!box) return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });

    const merchant = await getMerchant(session.merchantId);
    if (!merchant || box.merchantId !== merchant.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const result = await deleteBox(merchant.id, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
