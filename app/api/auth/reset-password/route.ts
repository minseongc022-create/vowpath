import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/auth-password";
import { verifyPasswordResetToken } from "@/lib/auth-reset-token";
import { updateUserPassword } from "@/lib/users-db";
import { apiErrorsEn } from "@/lib/api-errors-en";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resetToken = String(body?.resetToken ?? "").trim();
    const password = String(body?.password ?? "");
    const confirm = String(body?.passwordConfirm ?? "");

    if (!resetToken) {
      return NextResponse.json(
        { error: apiErrorsEn.resetSessionExpired },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: apiErrorsEn.passwordTooShort },
        { status: 400 },
      );
    }

    if (password !== confirm) {
      return NextResponse.json(
        { error: apiErrorsEn.passwordMismatch },
        { status: 400 },
      );
    }

    const userId = await verifyPasswordResetToken(resetToken);
    if (!userId) {
      return NextResponse.json(
        { error: apiErrorsEn.resetSessionExpired },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const updated = await updateUserPassword(userId, passwordHash);
    if (!updated) {
      return NextResponse.json(
        { error: apiErrorsEn.accountNotFound },
        { status: 404 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      message: apiErrorsEn.resetSuccess,
      email: updated.email,
      redirect: "/login",
    });
    res.cookies.set(clearSessionCookieOptions());
    return res;
  } catch (e) {
    console.error("[reset-password]", e);
    return NextResponse.json(
      { error: apiErrorsEn.resetFailed },
      { status: 500 },
    );
  }
}
