import { NextResponse } from "next/server";
import { z } from "zod";
import { createBox, getMerchant, listBoxes, defaultPickupWindow } from "@/giu/lib/store";

const createSchema = z.object({
  merchantId: z.string().min(1),
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  originalPriceVnd: z.number().int().min(10000),
  salePriceVnd: z.number().int().min(5000),
  quantityTotal: z.number().int().min(1).max(50),
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
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    const merchant = await getMerchant(parsed.data.merchantId);
    if (!merchant) {
      return NextResponse.json({ error: "Quán không tồn tại" }, { status: 404 });
    }
    if (parsed.data.salePriceVnd >= parsed.data.originalPriceVnd) {
      return NextResponse.json({ error: "Giá giải cứu phải thấp hơn giá gốc" }, { status: 400 });
    }
    const { start, end, expires } = defaultPickupWindow();
    const box = await createBox({
      merchantId: parsed.data.merchantId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: merchant.category,
      originalPriceVnd: parsed.data.originalPriceVnd,
      salePriceVnd: parsed.data.salePriceVnd,
      quantityTotal: parsed.data.quantityTotal,
      pickupStart: start,
      pickupEnd: end,
      expiresAt: expires,
    });
    return NextResponse.json({ box }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
