/**
 * GitHub App 설치 왕복에서 CSRF를 막는 state.
 *
 * 라우트 파일에 두면 Next.js가 "라우트가 내보낼 수 없는 항목"이라며 빌드를
 * 거절한다(route.ts는 HTTP 메서드와 정해진 설정만 내보낼 수 있다). 그래서
 * 시작 라우트와 콜백 라우트가 함께 쓰는 이 상수는 lib에 둔다.
 */
export const GITHUB_INSTALL_STATE_COOKIE = "vibesafe_gh_state";

export function installStateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
