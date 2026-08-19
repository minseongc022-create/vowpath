import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { isGiuCategory } from "@/giu/lib/categories";
import { isGiuDistrict } from "@/giu/lib/districts";
import { getMerchantByAccountId, updateMerchantProfile } from "@/giu/lib/store";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  address: z.string().min(5).max(200).optional(),
  addressHint: z.string().max(120).optional(),
  phone: z.string().min(8).max(20).optional(),
  category: z.string().refine(isGiuCategory).optional(),
  district: z.string().refine(isGiuDistrict).optional(),
  bankName: z.string().max(40).optional(),
  bankAccount: z.string().max(40).optional(),
  bankHolder: z.string().max(40).optional(),
  pickupPolicy: z
    .object({
      cancelFreeBeforeMinutes: z.number().int().min(15).max(240).optional(),
      extensionRequestBeforeMinutes: z.number().int().min(5).max(120).optional(),
      pickupGraceMinutes: z.number().int().min(10).max(120).optional(),
      lateCancelFeeRate: z.number().min(0.05).max(0.5).optional(),
      noShowFeeRate: z.number().min(0.05).max(0.5).optional(),
      merchantNoShowMarkAfterHours: z.number().int().min(6).max(72).optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  const session = await getGiuSessionFromRequest(request);
  if (!session || session.role !== "merchant") {
    return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
  }
  const merchant = await getMerchantByAccountId(session.sub);
  if (!merchant) return NextResponse.json({ error: "가게를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ merchant });
}

export async function PATCH(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant") {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }
    const merchant = await updateMerchantProfile(session.sub, parsed.data);
    if (!merchant) return NextResponse.json({ error: "가게를 찾을 수 없습니다" }, { status: 404 });
    if ("error" in merchant) {
      return NextResponse.json({ error: merchant.error }, { status: 409 });
    }
    return NextResponse.json({ merchant });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
