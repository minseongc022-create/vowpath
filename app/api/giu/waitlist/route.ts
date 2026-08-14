import { NextResponse } from "next/server";
import { z } from "zod";
import { addWaitlist } from "@/giu/lib/store";
import { isGiuDistrict } from "@/giu/lib/districts";

const schema = z.object({
  phone: z.string().min(8).max(20),
  district: z.string().refine((v) => !v || isGiuDistrict(v), "구(군) 값이 올바르지 않습니다").optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "전화번호가 올바르지 않습니다" },
        { status: 400 },
      );
    }
    const entry = await addWaitlist(parsed.data.phone, parsed.data.district);
    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
