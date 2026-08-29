import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
  resetRateLimit,
} from "@/lib/security/rate-limit";
import { verifyOwnerLogin } from "@/jarvis/core/owner-auth";
import { createJarvisSessionToken, jarvisSessionCookieOptions } from "@/jarvis/core/session";
import {
  createPendingOtpToken,
  generateOtpCode,
  hashOtpCode,
  pendingOtpCookieOptions,
} from "@/jarvis/core/otp";
import { loadState } from "@/jarvis/core/store";
import { sendLoginOtpSms } from "@/jarvis/engine/notify";

/**
 * 자비스 로그인 — 사장님 한 명만, 그리고 비밀번호만으로는 안 된다
 *
 * ★ 회원가입이 없다
 *
 * 자비스는 사장님 한 명의 상점을 돌리는 개인 자동화고, 저장소는 가맹점별로
 * 나뉘지 않은 **하나의 전역 상태**다. 그래서 "가입"이라는 개념 자체가 성립하지
 * 않는다 — 두 번째 사람이 들어오면 그건 새 상점이 아니라 사장님의 상점을
 * 같이 보는 것이다.
 *
 * ★ 왜 여기서 세션을 바로 내주지 않는가
 *
 * "다른 사람이 진짜 만약 접근하더라도 절대 못 들어오게" — 비밀번호 하나만
 * 맞으면 끝나는 구조에서는 그 비밀번호가 새는 순간(재사용·유출·추측) 전부
 * 뚫린다. 그래서 비밀번호가 맞아도 **아직 로그인시키지 않는다.** 6자리
 * 코드를 사장님 휴대폰으로 보내고, 그 코드를 맞혀야만 실제 세션이 나간다
 * (검증은 /api/jarvis/login/verify-otp). 비밀번호를 아는 것과 사장님
 * 휴대폰을 쥔 것은 별개의 조건이라, 하나가 새도 나머지 하나가 막는다.
 *
 * ★ 실패 이유를 사용자에게 구분해주지 않는다
 *
 * "계정이 없습니다"와 "비밀번호가 틀렸습니다"를 나눠서 알려주면, 어떤
 * 이메일이 존재하는지 확인해주는 셈이다. 어떤 이유든 같은 문구로 답한다.
 */
export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  // ★ 여기가 바깥에 열린 **유일한** 문이다
  //
  // 미들웨어가 나머지를 전부 막아도 이 라우트는 열려 있어야 로그인이 된다.
  // 그러면 남는 공격은 하나뿐이다 — 비밀번호를 계속 찍어보는 것. 시도
  // 횟수를 IP당 막아 그 길을 닫는다.
  const ip = clientIpFromRequest(request);
  const limit = await checkRateLimit({
    key: rateLimitKey("jarvis-login:ip", ip),
    limit: 8,
    windowSeconds: 15 * 60,
  });
  if (!limit.ok) {
    console.error("[jarvis/login] rate limited; ip=", ip);
    return NextResponse.json(
      { error: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const result = await verifyOwnerLogin(email, password);
    if (!result.ok) {
      // 이유는 로그에만 남긴다 — 응답 문구는 항상 같다
      console.warn(`[jarvis/login] 거절: ${result.reason}`);
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    // 비밀번호까지는 통과했다 — 시도 횟수를 지운다. 오타 몇 번 낸 걸로
    // 나중에 발목 잡히면 안 된다. 문자 인증 단계는 별도의 한도(verify-otp)가
    // 따로 담당한다.
    await resetRateLimit(rateLimitKey("jarvis-login:ip", ip));

    const state = await loadState();
    const phone = state.settings.alertPhone;

    // ★ 등록된 번호가 없으면 2단계 인증을 강제할 수 없다
    //
    // 없는 번호로 코드를 "보낸 척"하면 사장님이 영원히 못 들어온다.
    // 번호가 없을 땐 예전처럼 비밀번호만으로 들여보내되, 화면에서 번호를
    // 등록하도록 안내한다 — 번호가 생기는 순간부터 이 관문이 자동으로 켜진다.
    if (!phone) {
      console.warn("[jarvis/login] alertPhone 미등록 — 2단계 인증 없이 로그인");
      const token = await createJarvisSessionToken({
        sub: result.email,
        email: result.email,
        name: result.name,
      });
      const res = NextResponse.json({ ok: true, otpRequired: false, twoFactorWarning: true });
      res.cookies.set(jarvisSessionCookieOptions(token));
      return res;
    }

    const code = generateOtpCode();
    const otpHash = hashOtpCode(result.email, code);
    const pendingToken = await createPendingOtpToken({ email: result.email, otpHash });

    const sms = await sendLoginOtpSms(phone, code, state.settings);
    if (!sms.sent) {
      // 코드가 안 갔는데 다음 단계로 보내면 2단계 인증이 없는 것과 같다
      console.error("[jarvis/login] OTP 발송 실패:", sms.reason);
      return NextResponse.json(
        { error: "인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 },
      );
    }

    const res = NextResponse.json({ ok: true, otpRequired: true });
    res.cookies.set(pendingOtpCookieOptions(pendingToken));
    return res;
  } catch (e) {
    console.error("[jarvis/login]", e);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
