import { NextResponse } from "next/server";
import { installUrl, isGithubAppConfigured } from "@/vibesafe/lib/github/app";
import { randomToken } from "@/vibesafe/lib/crypto";
import { fail, requireSession } from "@/vibesafe/lib/http";
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
 */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  if (!isGithubAppConfigured()) {
    return fail("이 서버에는 GitHub App이 설정되어 있지 않습니다. 토큰으로 연결해주세요.", 503);
  }

  const state = randomToken(24);
  const url = installUrl(state);
  if (!url) return fail("GitHub App 설정을 확인해주세요.", 503);

  const response = NextResponse.redirect(url);
  response.cookies.set(GITHUB_INSTALL_STATE_COOKIE, state, installStateCookieOptions(600));
  return response;
}

export const dynamic = "force-dynamic";
