import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import { verifyPasswordResetToken } from "@/lib/auth-reset-token";
import { updateUserPassword } from "@/lib/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resetToken = String(body?.resetToken ?? "").trim();
    const password = String(body?.password ?? "");
    const confirm = String(body?.passwordConfirm ?? "");

    if (!resetToken) {
      return NextResponse.json(
        { error: "인증이 만료되었습니다. 처음부터 다시 시도해 주세요." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    if (password !== confirm) {
      return NextResponse.json(
        { error: "비밀번호 확인이 일치하지 않습니다." },
        { status: 400 },
      );
    }

    const userId = await verifyPasswordResetToken(resetToken);
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 만료되었습니다. 처음부터 다시 시도해 주세요." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const updated = await updateUserPassword(userId, passwordHash);
    if (!updated) {
      return NextResponse.json(
        { error: "계정을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
      redirect: "/login",
    });
  } catch (e) {
    console.error("[reset-password]", e);
    return NextResponse.json(
      { error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
