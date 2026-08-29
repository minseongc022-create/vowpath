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

/**
 * 자비스 로그인 — 사장님 한 명만
 *
 * ★ 회원가입이 없다
 *
 * 자비스는 사장님 한 명의 상점을 돌리는 개인 자동화고, 저장소는 가맹점별로
 * 나뉘지 않은 **하나의 전역 상태**다. 그래서 "가입"이라는 개념 자체가 성립하지
 * 않는다 — 두 번째 사람이 들어오면 그건 새 상점이 아니라 사장님의 상점을
 * 같이 보는 것이다. 실제로 옛 로그인은 회원가입이 열려 있어 아무나 가입만
 * 하면 사장님의 대화·목표·전화번호·연동 상태를 그대로 보고 설정까지 바꿀 수
 * 있는 구멍이 있었다.
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
  // 횟수를 IP당 막아 그 길을 닫는다. 성공하면 즉시 초기화해서, 사장님이
  // 한 번 오타를 냈다고 나중에 못 들어오는 일이 없게 한다.
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

    // 들어왔으니 시도 횟수는 지운다 — 오타 몇 번이 나중에 발목을 잡으면 안 된다
    await resetRateLimit(rateLimitKey("jarvis-login:ip", ip));

    const token = await createJarvisSessionToken({
      sub: result.email,
      email: result.email,
      name: result.name,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(jarvisSessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[jarvis/login]", e);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
