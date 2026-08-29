import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
} from "@/lib/security/rate-limit";
import { isOwnerEmail } from "@/jarvis/core/access";
import { createJarvisSessionToken, jarvisSessionCookieOptions } from "@/jarvis/core/session";
import {
  clearPendingOtpCookieOptions,
  hashOtpCode,
  otpHashMatches,
  PENDING_OTP_COOKIE,
  verifyPendingOtpToken,
} from "@/jarvis/core/otp";

/**
 * 로그인 2단계 — 문자로 받은 코드를 확인한다
 *
 * ★ 여기서 진짜 세션이 나간다
 *
 * /api/jarvis/login은 비밀번호가 맞아도 세션을 안 준다. 세션은 오직
 * 여기서, 코드가 맞을 때만 나간다. 이 두 조건(비밀번호를 안다 + 문자를
 * 받았다)이 모두 갖춰져야 들어올 수 있다.
 *
 * ★ 코드도 시도 횟수를 막는다
 *
 * 6자리는 백만 가지뿐이라, 시도 제한이 없으면 5분 안에 총력으로 찍어볼
 * 수 있다. IP당 시도 횟수를 좁게 잡는다 — 로그인 자체의 한도(8회/15분)보다
 * 빡빡하게, 여기서 뚫리면 비밀번호를 안 뚫어도 되는 것과 같기 때문이다.
 */
export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const ip = clientIpFromRequest(request);
  const limit = await checkRateLimit({
    key: rateLimitKey("jarvis-otp:ip", ip),
    limit: 6,
    windowSeconds: 10 * 60,
  });
  if (!limit.ok) {
    console.error("[jarvis/login/verify-otp] rate limited; ip=", ip);
    return NextResponse.json(
      { error: "시도가 너무 많습니다. 처음부터 다시 로그인해 주세요." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "6자리 숫자를 입력해 주세요." }, { status: 400 });
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(new RegExp(`${PENDING_OTP_COOKIE}=([^;]+)`));
    const pendingToken = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!pendingToken) {
      return NextResponse.json(
        { error: "인증 시간이 지났습니다. 처음부터 다시 로그인해 주세요." },
        { status: 401 },
      );
    }

    const pending = await verifyPendingOtpToken(pendingToken);
    if (!pending || !isOwnerEmail(pending.email)) {
      return NextResponse.json(
        { error: "인증 시간이 지났습니다. 처음부터 다시 로그인해 주세요." },
        { status: 401 },
      );
    }

    const submittedHash = hashOtpCode(pending.email, code);
    if (!otpHashMatches(submittedHash, pending.otpHash)) {
      return NextResponse.json({ error: "인증번호가 올바르지 않습니다." }, { status: 401 });
    }

    // 여기까지 왔으면 비밀번호(1단계)와 문자 코드(2단계)를 모두 통과했다
    const token = await createJarvisSessionToken({
      sub: pending.email,
      email: pending.email,
      name: "사장님",
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(jarvisSessionCookieOptions(token));
    res.cookies.set(clearPendingOtpCookieOptions());
    return res;
  } catch (e) {
    console.error("[jarvis/login/verify-otp]", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
