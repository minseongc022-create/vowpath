import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { checkSignupCode, completeVerifiedSignup } from "@/lib/signup-verify";
import { deletePendingSignup } from "@/lib/signup-verify-store";
import { createUser } from "@/lib/users-db";
import { initializeNewTenantShopSettings } from "@/lib/shop-settings-db";
import { apiErrorsEn } from "@/lib/api-errors-en";
import { ROUTES } from "@/lib/constants";

/** Legacy: check + complete in one step */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signupRequestId = String(body?.signupRequestId ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!signupRequestId || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: apiErrorsEn.codeRequired },
        { status: 400 },
      );
    }

    const checked = await checkSignupCode(signupRequestId, code);
    if ("error" in checked) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    const result = await completeVerifiedSignup(signupRequestId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { pending } = result;

    const user = await createUser({
      email: pending.email,
      passwordHash: pending.passwordHash,
      shopName: pending.shopName,
      phone: pending.phone,
    });

    await deletePendingSignup(signupRequestId);

    await initializeNewTenantShopSettings(user.id);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
      sessionVersion: user.sessionVersion ?? 0,
    });

    const res = NextResponse.json({
      ok: true,
      redirect: "/settings",
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[signup/verify]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: apiErrorsEn.kvNotConfigured },
        { status: 503 },
      );
    }
    if (e instanceof Error && e.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: apiErrorsEn.emailAlreadyRegistered },
        { status: 409 },
      );
    }
    if (e instanceof Error && e.message === "PHONE_REQUIRED") {
      return NextResponse.json(
        { error: apiErrorsEn.phoneRequired },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === "PHONE_EXISTS") {
      return NextResponse.json(
        { error: apiErrorsEn.phoneAlreadyRegistered },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: apiErrorsEn.signupFailed },
      { status: 500 },
    );
  }
}
