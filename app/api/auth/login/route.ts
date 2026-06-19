import { NextResponse } from "next/server";
import {
  clearSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { normalizeSmsPhone } from "@/lib/phone";
import { findUserByEmail, findUserByPhone } from "@/lib/users-db";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
  resetRateLimit,
} from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";
import { apiErrorsEn } from "@/lib/api-errors-en";

const INVALID_CREDENTIALS = apiErrorsEn.invalidCredentials;

function unauthorized(message = INVALID_CREDENTIALS) {
  const res = NextResponse.json({ ok: false, error: message }, { status: 401 });
  res.cookies.set(clearSessionCookieOptions());
  return res;
}

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const ipKey = rateLimitKey("login:ip", ip);
    const ipLimit = await checkRateLimit({
      key: ipKey,
      limit: 30,
      windowSeconds: 10 * 60,
    });
    if (!ipLimit.ok) {
      await recordSecurityAudit({ event: "login_rate_limited", ip, detail: "ip" });
      return unauthorized();
    }

    const body = await request.json();
    const password = String(body?.password ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phoneRaw = String(body?.phone ?? "").trim();

    if (!password || (!email && !phoneRaw)) {
      return NextResponse.json(
        { ok: false, error: apiErrorsEn.loginFieldsRequired },
        { status: 400 },
      );
    }

    const identityKey = rateLimitKey(
      "login:identity",
      phoneRaw ? `phone:${phoneRaw.replace(/\D/g, "")}` : `email:${email}`,
    );
    const identityLimit = await checkRateLimit({
      key: identityKey,
      limit: 8,
      windowSeconds: 15 * 60,
    });
    if (!identityLimit.ok) {
      await recordSecurityAudit({
        event: "login_rate_limited",
        ip,
        detail: phoneRaw ? "phone" : email,
      });
      return unauthorized();
    }

    let user;

    if (phoneRaw) {
      const phone = normalizeSmsPhone(phoneRaw);
      if (!phone) {
        return NextResponse.json(
          { ok: false, error: apiErrorsEn.invalidUsPhone },
          { status: 400 },
        );
      }
      user = await findUserByPhone(phone);
    } else {
      user = await findUserByEmail(email);
    }

    if (!user) {
      await recordSecurityAudit({
        event: "login_failed",
        ip,
        detail: phoneRaw ? "phone" : email,
      });
      return unauthorized();
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      await recordSecurityAudit({
        userId: user.id,
        event: "login_failed",
        ip,
        detail: "bad_password",
      });
      return unauthorized();
    }

    await resetRateLimit(identityKey);
    await recordSecurityAudit({ userId: user.id, event: "login_success", ip });

    const rememberMe = body?.rememberMe !== false;

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
      sessionVersion: user.sessionVersion ?? 0,
    });

    const res = NextResponse.json({
      ok: true,
      redirect: "/dashboard",
    });
    res.cookies.set(sessionCookieOptions(token, rememberMe));
    return res;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json(
      { ok: false, error: apiErrorsEn.loginFailed },
      { status: 500 },
    );
  }
}
