import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { addReview, listMerchantReviews } from "@/giu/lib/store";

const createSchema = z.object({
  reservationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const merchantId = url.searchParams.get("merchantId")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: "merchantId required" }, { status: 400 });
  }
  const reviews = await listMerchantReviews(merchantId);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }
    const result = await addReview({
      reservationId: parsed.data.reservationId,
      customerId: session.sub,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ review: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
