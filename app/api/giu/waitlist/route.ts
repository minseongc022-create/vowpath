import { NextResponse } from "next/server";
import { z } from "zod";
import { addWaitlist } from "@/giu/lib/store";
import { isGiuDistrict } from "@/giu/lib/districts";

const schema = z.object({
  phone: z.string().min(8).max(20),
  district: z.string().refine((v) => !v || isGiuDistrict(v), "Quận không hợp lệ").optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "SĐT không hợp lệ" },
        { status: 400 },
      );
    }
    const entry = await addWaitlist(parsed.data.phone, parsed.data.district);
    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
