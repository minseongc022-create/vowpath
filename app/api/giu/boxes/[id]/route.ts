import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { isAllowedGiuImageUrl } from "@/giu/lib/image-url";
import { getBox, getMerchant, updateBox } from "@/giu/lib/store";

const patchSchema = z.object({
  status: z.enum(["mo", "het", "huy"]).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z
    .union([
      z.literal(""),
      z.string().max(500).refine((v) => isAllowedGiuImageUrl(v), "이미지 URL이 올바르지 않습니다"),
    ])
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
    if (!box) return NextResponse.json({ error: "박스를 찾을 수 없습니다" }, { status: 404 });

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

    const { imageUrl, ...rest } = parsed.data;
    const updated = await updateBox(id, {
      ...rest,
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || undefined } : {}),
    });
    return NextResponse.json({ box: updated });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
