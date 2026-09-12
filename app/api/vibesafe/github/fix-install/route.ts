import { NextResponse } from "next/server";
import { randomToken } from "@/vibesafe/lib/crypto";
import { fixInstallUrl, isFixAppConfigured } from "@/vibesafe/lib/github/write-connection";
import { GITHUB_INSTALL_STATE_COOKIE, installStateCookieOptions } from "@/vibesafe/lib/github/install-state";
import { fail, requireSession } from "@/vibesafe/lib/http";

/** 수정 권한이 있는 두 번째 GitHub App 설치로 보낸다. */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  if (!isFixAppConfigured()) {
    return fail("이 서버에는 수정용 GitHub App이 설정되어 있지 않습니다. 토큰으로 연결해주세요.", 503);
  }
  const state = `fix:${randomToken(20)}`;
  const url = fixInstallUrl(state);
  if (!url) return fail("GitHub App 설정을 확인해주세요.", 503);

  const response = NextResponse.redirect(url);
  response.cookies.set(GITHUB_INSTALL_STATE_COOKIE, state, installStateCookieOptions(600));
  return response;
}

export const dynamic = "force-dynamic";
