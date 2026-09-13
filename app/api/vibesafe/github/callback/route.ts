import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { findOrCreateFromGithub } from "@/vibesafe/lib/auth";
import { safeCompare } from "@/vibesafe/lib/crypto";
import { exchangeOAuthCode } from "@/vibesafe/lib/github/app";
import { getViewer, getViewerEmail } from "@/vibesafe/lib/github/client";
import { connectWithInstallation } from "@/vibesafe/lib/github/connection";
import { connectWriteWithInstallation } from "@/vibesafe/lib/github/write-connection";
import { createSessionToken, sessionCookieOptions, VIBESAFE_SESSION_COOKIE, getSession } from "@/vibesafe/lib/session";
import { GITHUB_INSTALL_STATE_COOKIE } from "@/vibesafe/lib/github/install-state";

/**
 * 설치 후 GitHub이 되돌려보내는 자리. 실패해도 사용자는 화면에서 이유를 본다.
 *
 * ★ state에 세 가지 의미가 겹쳐 있다
 *
 * 접두사 없음 = 이미 로그인한 사람이 기본(읽기) App을 연결.
 * `fix:`      = 이미 로그인한 사람이 두 번째(쓰기) App을 연결.
 * `signup:`   = 로그인 안 한 사람이 "GitHub로 계속하기"로 왔다 — 이 콜백이
 *               직접 계정을 만들거나 찾아 로그인시킨 뒤, 나머지는 평소
 *               연결 흐름과 똑같이 이어간다.
 *
 * 콜백 URL을 하나로 유지하는 이유는 App을 늘릴 때마다 GitHub 쪽 설정을
 * 늘리지 않기 위해서다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const expected = (await cookies()).get(GITHUB_INSTALL_STATE_COOKIE)?.value;
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set(GITHUB_INSTALL_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  if (!state || !expected || !safeCompare(state, expected)) {
    return clearStateCookie(
      NextResponse.redirect(new URL("/vibesafe/login?github_error=state", url.origin)),
    );
  }
  if (!installationId || !/^\d+$/.test(installationId)) {
    return clearStateCookie(
      NextResponse.redirect(new URL("/vibesafe/login?github_error=installation", url.origin)),
    );
  }

  const isFixApp = state.startsWith("fix:");
  const isSignupIntent = state.startsWith("signup:");

  let session = await getSession();
  let newSessionCookieValue: string | null = null;

  if (!session && isSignupIntent) {
    if (!code) {
      return clearStateCookie(
        NextResponse.redirect(new URL("/vibesafe/login?github_error=oauth", url.origin)),
      );
    }
    try {
      const userToken = await exchangeOAuthCode(code);
      const viewer = await getViewer(userToken);
      const verifiedEmail = await getViewerEmail(userToken);
      const result = await findOrCreateFromGithub({
        githubUserId: String(viewer.id),
        login: viewer.login,
        verifiedEmail,
      });
      if (result.status === "email_taken") {
        return clearStateCookie(
          NextResponse.redirect(new URL("/vibesafe/login?github_error=email_taken", url.origin)),
        );
      }
      await recordEvent({ name: "signup_completed", userId: result.user.id, props: { via: "github" } });
      session = { userId: result.user.id, email: result.user.email, name: result.user.name };
      newSessionCookieValue = await createSessionToken(session);
    } catch (error) {
      console.error("[vibesafe] github signup callback failed:", (error as Error).message);
      return clearStateCookie(
        NextResponse.redirect(new URL("/vibesafe/login?github_error=connect", url.origin)),
      );
    }
  }

  if (!session) {
    return clearStateCookie(NextResponse.redirect(new URL("/vibesafe/login", url.origin)));
  }

  const finish = (target: URL) => {
    const response = NextResponse.redirect(target);
    clearStateCookie(response);
    if (newSessionCookieValue) {
      response.cookies.set(VIBESAFE_SESSION_COOKIE, newSessionCookieValue, sessionCookieOptions());
    }
    return response;
  };

  try {
    if (isFixApp) {
      await connectWriteWithInstallation(session.userId, installationId);
      const target = new URL("/vibesafe/dashboard", url.origin);
      target.searchParams.set("github_write", "connected");
      return finish(target);
    }

    await connectWithInstallation(session.userId, installationId);
    await recordEvent({
      name: "github_connected",
      userId: session.userId,
      props: { authKind: "app_installation" },
    });
    const target = new URL("/vibesafe/projects/new", url.origin);
    target.searchParams.set("github", "connected");
    return finish(target);
  } catch (error) {
    console.error("[vibesafe] github install callback failed:", (error as Error).message);
    const target = new URL("/vibesafe/projects/new", url.origin);
    target.searchParams.set("github_error", "connect");
    return finish(target);
  }
}

export const dynamic = "force-dynamic";
