import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { isKrOwnerPhoneEmail } from "@/lib/owner-phone-policy";
import {
  formatOwnerPhoneDisplay,
  isKrSmsTestMode,
  isOwnerContactCompleteForSms,
  normalizeOwnerAlertPhone,
} from "@/lib/sms-region-config";
import { isValidBusinessEmail } from "@/lib/us-contact";
import { findUserById, updateUserContact } from "@/lib/users-db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const phoneE164 = normalizeOwnerAlertPhone(user.phone ?? "", user.email) ?? "";
  const krOwner = isKrOwnerPhoneEmail(user.email);
  return NextResponse.json({
    email: user.email,
    phone: user.phone ?? "",
    phoneDisplay: phoneE164 ? formatOwnerPhoneDisplay(phoneE164) : "",
    contactComplete: isOwnerContactCompleteForSms(user),
    krTestMode: isKrSmsTestMode() || krOwner,
    krOwnerPhone: krOwner,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();

    if (!email || !phoneRaw) {
      return NextResponse.json(
        {
          error: isKrSmsTestMode()
            ? "이메일과 휴대폰 번호를 모두 입력해 주세요."
            : "이메일과 미국 휴대폰 번호를 모두 입력해 주세요.",
        },
        { status: 400 },
      );
    }

    if (!isValidBusinessEmail(email)) {
      return NextResponse.json(
        { error: "이메일 형식을 확인해 주세요." },
        { status: 400 },
      );
    }

    const krPhoneAllowed = isKrSmsTestMode() || isKrOwnerPhoneEmail(email);
    if (!normalizeOwnerAlertPhone(phoneRaw, email)) {
      return NextResponse.json(
        {
          error: krPhoneAllowed
            ? "전화번호 형식을 확인해 주세요. (한국: 010-1234-5678 · 미국: (512) 555-0100)"
            : "미국 전화번호 형식을 확인해 주세요. (예: (512) 555-0100 또는 +1 512-555-0100)",
        },
        { status: 400 },
      );
    }

    const user = await updateUserContact(session.sub, { email, phone: phoneRaw });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
    });

    const e164 =
      normalizeOwnerAlertPhone(user.phone ?? "", user.email) ?? user.phone ?? "";
    const krOwner = isKrOwnerPhoneEmail(user.email);
    const res = NextResponse.json({
      ok: true,
      email: user.email,
      phone: user.phone,
      phoneDisplay: e164 ? formatOwnerPhoneDisplay(e164) : "",
      contactComplete: isOwnerContactCompleteForSms(user),
      krTestMode: isKrSmsTestMode() || krOwner,
      krOwnerPhone: krOwner,
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          { error: "이미 사용 중인 이메일입니다." },
          { status: 409 },
        );
      }
      if (e.message === "PHONE_EXISTS") {
        return NextResponse.json(
          { error: "이미 등록된 전화번호입니다." },
          { status: 409 },
        );
      }
    }
    console.error("[account/contact]", e);
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }
}
