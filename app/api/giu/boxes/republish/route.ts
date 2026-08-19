import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMerchantSession } from "@/giu/lib/auth-request";
import { getMerchantByAccountId, republishBox, republishLastBox } from "@/giu/lib/store";

const bodySchema = z.object({
  boxId: z.string().min(1).optional(),
  dayOffset: z.number().int().min(0).max(1).optional(),
  pickupStartH: z.number().int().min(6).max(23).optional(),
  pickupEndH: z.number().int().min(6).max(23).optional(),
});

function parseSchedule(parsed: z.infer<typeof bodySchema>) {
  if (
    parsed.dayOffset === undefined ||
    parsed.pickupStartH === undefined ||
    parsed.pickupEndH === undefined
  ) {
    return undefined;
  }
  return {
    dayOffset: parsed.dayOffset,
    startH: parsed.pickupStartH,
    endH: parsed.pickupEndH,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireMerchantSession(request);
    if (!auth) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }
    const merchantId = auth.merchantId;

    let boxId: string | undefined;
    let schedule: ReturnType<typeof parseSchedule>;
    try {
      const body = await request.json();
      const parsed = bodySchema.safeParse(body);
      if (parsed.success) {
        boxId = parsed.data.boxId;
        schedule = parseSchedule(parsed.data);
      }
    } catch {
      /* empty body — republish last */
    }

    const result = boxId
      ? await republishBox(merchantId, boxId, schedule)
      : await republishLastBox(merchantId, schedule);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ box: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
