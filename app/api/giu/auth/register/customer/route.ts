import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createGiuSessionToken,
  giuSessionCookieOptions,
} from "@/giu/lib/auth";
import { registerCustomer } from "@/giu/lib/store";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(20),
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
    const result = await registerCustomer(parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    const { account } = result;
    const token = await createGiuSessionToken({
      sub: account.id,
      role: "customer",
      email: account.email,
      phone: account.phone,
      name: account.name,
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
      },
      { status: 201 },
    );
    response.cookies.set(giuSessionCookieOptions(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
