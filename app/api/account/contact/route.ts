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
import { findUserById, updateUserContact, updateUserShopName } from "@/lib/users-db";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { apiErrorsEn } from "@/lib/api-errors-en";

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
    shopName: user.shopName ?? "",
    contactComplete: isOwnerContactCompleteForSms(user),
    krTestMode: isKrSmsTestMode() || krOwner,
    krOwnerPhone: krOwner,
  });
}

export async function PATCH(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const emailRaw = body?.email != null ? String(body.email).trim() : "";
    const phoneRaw = body?.phone != null ? String(body.phone).trim() : "";
    const shopNameRaw = body?.shopName != null ? String(body.shopName).trim() : "";

    const userBefore = await findUserById(session.sub);
    if (!userBefore) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let user = userBefore;

    if (shopNameRaw) {
      const updated = await updateUserShopName(session.sub, shopNameRaw);
      if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      user = updated;
    } else if (body?.shopName != null && !shopNameRaw) {
      return NextResponse.json({ error: apiErrorsEn.shopNameRequired }, { status: 400 });
    }

    if (emailRaw || phoneRaw) {
      if (!emailRaw || !phoneRaw) {
        return NextResponse.json(
          {
            error: isKrSmsTestMode()
              ? apiErrorsEn.contactFieldsRequiredDev
              : apiErrorsEn.contactFieldsRequired,
          },
          { status: 400 },
        );
      }

      if (!isValidBusinessEmail(emailRaw)) {
        return NextResponse.json(
          { error: apiErrorsEn.invalidEmail },
          { status: 400 },
        );
      }

      const krPhoneAllowed = isKrSmsTestMode() || isKrOwnerPhoneEmail(emailRaw);
      if (!normalizeOwnerAlertPhone(phoneRaw, emailRaw)) {
        return NextResponse.json(
          {
            error: krPhoneAllowed
              ? "Check the phone format. US: (512) 555-0100"
              : apiErrorsEn.phoneFormatUs,
          },
          { status: 400 },
        );
      }

      const updated = await updateUserContact(session.sub, { email: emailRaw, phone: phoneRaw });
      if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      user = updated;
    }

    if (!shopNameRaw && !emailRaw && !phoneRaw) {
      return NextResponse.json({ error: apiErrorsEn.nothingToSave }, { status: 400 });
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
      sessionVersion: user.sessionVersion ?? 0,
    });

    const e164 =
      normalizeOwnerAlertPhone(user.phone ?? "", user.email) ?? user.phone ?? "";
    const krOwner = isKrOwnerPhoneEmail(user.email);
    const res = NextResponse.json({
      ok: true,
      email: user.email,
      phone: user.phone,
      phoneDisplay: e164 ? formatOwnerPhoneDisplay(e164) : "",
      shopName: user.shopName,
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
          { error: apiErrorsEn.emailInUse },
          { status: 409 },
        );
      }
      if (e.message === "PHONE_EXISTS") {
        return NextResponse.json(
          { error: apiErrorsEn.phoneInUse },
          { status: 409 },
        );
      }
      if (e.message === "SHOP_NAME_REQUIRED") {
        return NextResponse.json(
          { error: apiErrorsEn.shopNameRequired },
          { status: 400 },
        );
      }
    }
    console.error("[account/contact]", e);
    return NextResponse.json({ error: apiErrorsEn.saveFailed }, { status: 500 });
  }
}
