import { NextResponse } from "next/server";
import { apiErrorsEn } from "@/lib/api-errors-en";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { notifyPlatformOwnerNewSignup } from "@/lib/platform-owner-notify";
import { ownerSignupPhoneError } from "@/lib/owner-phone-policy";
import { completeVerifiedSignup, normalizeSignupPhone } from "@/lib/signup-verify";
import { deletePendingSignup, getPendingSignup } from "@/lib/signup-verify-store";
import { createUser } from "@/lib/users-db";
import { ensureTenantTwilioPhone } from "@/lib/twilio-provision";
import { initializeNewTenantShopSettings } from "@/lib/shop-settings-db";
import { saveShopProfile } from "@/lib/shop-profile-db";
import { normalizeShopVertical } from "@/lib/shop-vertical";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signupRequestId = String(body?.signupRequestId ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();
    const vertical = normalizeShopVertical(body?.vertical);
    if (!signupRequestId) {
      return NextResponse.json({ error: apiErrorsEn.verifyFirst }, { status: 400 });
    }

    const pendingForEmail = signupRequestId
      ? await getPendingSignup(signupRequestId)
      : null;
    const ownerEmail = pendingForEmail?.email ?? "";
    const phone = phoneRaw
      ? normalizeSignupPhone(phoneRaw, ownerEmail)
      : null;

    if (phoneRaw && !phone) {
      return NextResponse.json(
        { error: ownerSignupPhoneError(ownerEmail) },
        { status: 400 },
      );
    }

    const result = await completeVerifiedSignup(signupRequestId, phone ?? undefined);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { pending } = result;

    const user = await createUser({
      email: pending.email,
      passwordHash: pending.passwordHash,
      shopName: pending.shopName,
      phone: pending.phone,
      legalConsent: pending.legalConsent,
    });

    await deletePendingSignup(signupRequestId);

    try {
      await notifyPlatformOwnerNewSignup({
        shopName: user.shopName,
        email: user.email,
        vertical,
        userId: user.id,
      });
    } catch (e) {
      console.warn("[signup/complete] platform owner alert", e);
    }

    await initializeNewTenantShopSettings(user.id, vertical);
    await saveShopProfile(user.id, { vertical });

    let phoneProvisioned = false;
    let phoneNumber: string | undefined;
    let phoneError: string | null = null;
    try {
      const provision = await ensureTenantTwilioPhone(user.id, {
        shopPhone: user.phone,
      });
      if (provision.ok) {
        phoneProvisioned = true;
        phoneNumber = provision.phoneNumber;
      } else {
        phoneError = provision.error;
        console.warn("[signup/complete] phone provision:", provision.error);
      }
    } catch (e) {
      phoneError =
        e instanceof Error ? e.message : apiErrorsEn.phoneProvisionFailed;
      console.error("[signup/complete] phone provision", e);
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
      sessionVersion: user.sessionVersion ?? 0,
    });

    const res = NextResponse.json({
      ok: true,
      redirect: phoneProvisioned
        ? "/dashboard/settings?phoneReady=1#go-live-phone"
        : "/dashboard/settings",
      phoneProvisioned,
      phoneNumber,
      phoneError,
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[signup/complete]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json({ error: apiErrorsEn.kvNotConfigured }, { status: 503 });
    }
    if (e instanceof Error && e.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: apiErrorsEn.emailAlreadyRegistered }, { status: 409 });
    }
    if (e instanceof Error && e.message === "PHONE_REQUIRED") {
      return NextResponse.json({ error: apiErrorsEn.phoneRequired }, { status: 400 });
    }
    if (e instanceof Error && e.message === "PHONE_EXISTS") {
      return NextResponse.json({ error: apiErrorsEn.phoneAlreadyRegistered }, { status: 409 });
    }
    return NextResponse.json({ error: apiErrorsEn.signupFailed }, { status: 500 });
  }
}
