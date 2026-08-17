import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authEmailError,
  authPasswordError,
  normalizeAuthEmail,
} from "@/giu/lib/auth-validation";
import {
  createGiuSessionToken,
  giuSessionCookieOptions,
} from "@/giu/lib/auth";
import { registerCustomer } from "@/giu/lib/store";

const schema = z.object({
  email: z.string().min(1, "이메일을 입력해 주세요"),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
  name: z.string().min(2, "이름은 2자 이상 입력해 주세요").max(80),
  phone: z.string().min(8).max(20),
  market: z.enum(["vn", "kr"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const emailErr = authEmailError(parsed.data.email);
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }
    const passwordErr = authPasswordError(parsed.data.password);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    const result = await registerCustomer({
      ...parsed.data,
      email: normalizeAuthEmail(parsed.data.email),
    });
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
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
