import { NextResponse } from "next/server";
import { z } from "zod";
import { isGiuCategory } from "@/giu/lib/categories";
import { isGiuDistrict } from "@/giu/lib/districts";
import {
  createMerchant,
  getMerchantByPhone,
  listMerchants,
} from "@/giu/lib/store";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().refine(isGiuCategory, "Loại hình không hợp lệ"),
  district: z.string().refine(isGiuDistrict, "Quận không hợp lệ"),
  address: z.string().min(5).max(200),
  phone: z.string().min(8).max(20),
  zalo: z.string().min(8).max(20).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");
  if (phone) {
    const merchant = await getMerchantByPhone(phone);
    if (!merchant) {
      return NextResponse.json({ error: "Không tìm thấy quán" }, { status: 404 });
    }
    return NextResponse.json({ merchant });
  }
  const district = url.searchParams.get("district") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const merchants = await listMerchants({ district, category });
  return NextResponse.json({ merchants });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    const existing = await getMerchantByPhone(parsed.data.phone);
    if (existing) {
      return NextResponse.json({ merchant: existing }, { status: 200 });
    }
    const merchant = await createMerchant(parsed.data);
    return NextResponse.json({ merchant }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
