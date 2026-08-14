import { NextResponse } from "next/server";
import { z } from "zod";
import { createGiuSessionToken, giuSessionCookieOptions } from "@/giu/lib/auth";
import { isGiuCategory } from "@/giu/lib/categories";
import { isGiuDistrict } from "@/giu/lib/districts";
import { registerMerchantAccount } from "@/giu/lib/store";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  name: z.string().min(2).max(120),
  category: z.string().refine(isGiuCategory, "Loại hình không hợp lệ"),
  district: z.string().refine(isGiuDistrict, "Quận không hợp lệ"),
  address: z.string().min(5).max(200),
  phone: z.string().min(8).max(20),
  zalo: z.string().min(8).max(20).optional(),
  market: z.enum(["vn", "kr"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    const result = await registerMerchantAccount(parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    const { account, merchant } = result;
    const token = await createGiuSessionToken({
      sub: account.id,
      role: "merchant",
      email: account.email,
      phone: account.phone,
      name: account.name,
      merchantId: merchant.id,
      market: account.market,
    });
    const response = NextResponse.json(
      {
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
          phone: account.phone,
          role: account.role,
          market: account.market,
        },
        merchant,
      },
      { status: 201 },
    );
    response.cookies.set(giuSessionCookieOptions(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
