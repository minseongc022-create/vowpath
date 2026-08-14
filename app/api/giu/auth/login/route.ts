import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createGiuSessionToken,
  giuSessionCookieOptions,
} from "@/giu/lib/auth";
import { getMerchantByAccountId, loginAccount } from "@/giu/lib/store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["customer", "merchant"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 400 });
    }
    const result = await loginAccount(parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const { account } = result;
    if (parsed.data.role && account.role !== parsed.data.role) {
      return NextResponse.json({ error: "Tài khoản không đúng loại đăng nhập" }, { status: 401 });
    }
    const merchant =
      account.role === "merchant"
        ? await getMerchantByAccountId(account.id)
        : null;
    const token = await createGiuSessionToken({
      sub: account.id,
      role: account.role,
      email: account.email,
      phone: account.phone,
      name: account.name,
      merchantId: merchant?.id,
      market: account.market,
    });
    const response = NextResponse.json({
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        phone: account.phone,
        role: account.role,
        market: account.market,
      },
      merchant,
    });
    response.cookies.set(giuSessionCookieOptions(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
