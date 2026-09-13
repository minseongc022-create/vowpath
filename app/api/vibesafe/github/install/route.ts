import { NextResponse } from "next/server";
import { installUrl, isGithubAppConfigured, isGithubOAuthConfigured } from "@/vibesafe/lib/github/app";
import { randomToken } from "@/vibesafe/lib/crypto";
import { enforceRateLimit, fail, requireSession } from "@/vibesafe/lib/http";
import { getSession } from "@/vibesafe/lib/session";
import {
  GITHUB_INSTALL_STATE_COOKIE,
  installStateCookieOptions,
} from "@/vibesafe/lib/github/install-state";

/**
 * GitHub App 설치 페이지로 보낸다.
 *
 * state를 쿠키에도 같이 심어두고 콜백에서 대조한다 — 이게 없으면 공격자가
 * **자기 설치**의 콜백 URL을 피해자에게 열게 해서 피해자 계정에 자기 저장소를
 * 붙일 수 있다(로그인 CSRF의 변형).
 *
 * ★ `?intent=signup`
 *
 * 로그인 없이도 이 라우트를 탈 수 있는 유일한 경우다 — "GitHub로 계속하기"
 * 버튼이 여기로 보낸다. state에 `signup:` 접두사를 붙여 콜백이 "이건 로그인
 * 없는 가입 시도다"를 알게 한다(기존 `fix:` 접두사와 같은 방식). OAuth
 * 신원 확인이 설정돼 있지 않으면(client_id/secret 또는 App의 "Request user
 * authorization" 설정 누락) 애초에 이 의도를 받지 않는다 — 신원을 못 얻으면
 * 계정을 만들 수 없기 때문이다.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const isSignupIntent = requestUrl.searchParams.get("intent") === "signup";

  if (isSignupIntent) {
    // 로그인 없이 두드릴 수 있는 시작점이라 IP 기준으로 속도를 제한한다.
    const limited = await enforceRateLimit({
      request, scope: "github-signup-start", limit: 10, windowSeconds: 600,
    });
    if (limited) return limited;

    if (await getSession()) {
      // 이미 로그인돼 있으면 가입 의도가 무의미하다 — 일반 연결로 처리한다.
    } else if (!isGithubOAuthConfigured()) {
      return fail("이 서버는 GitHub로 가입하는 기능이 아직 설정되지 않았습니다.", 503);
    }
  } else {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;
  }

  if (!isGithubAppConfigured()) {
    return fail("이 서버에는 GitHub App이 설정되어 있지 않습니다. 토큰으로 연결해주세요.", 503);
  }

  const state = randomToken(24);
  const finalState = isSignupIntent ? `signup:${state}` : state;
  const installTarget = installUrl(finalState);
  if (!installTarget) return fail("GitHub App 설정을 확인해주세요.", 503);

  const response = NextResponse.redirect(installTarget);
  // 쿠키에도 접두사가 붙은 전체 state를 그대로 저장한다 — 콜백은 URL로
  // 돌아온 state와 쿠키 값을 접두사까지 포함해 그대로 비교한다(fix-install
  // 라우트와 같은 방식). 한쪽만 접두사를 붙이면 정상 요청도 CSRF 검사에서
  // 튕긴다.
  response.cookies.set(GITHUB_INSTALL_STATE_COOKIE, finalState, installStateCookieOptions(600));
  return response;
}

export const dynamic = "force-dynamic";
