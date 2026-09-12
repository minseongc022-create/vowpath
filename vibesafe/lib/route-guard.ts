/**
 * 로그인이 필요한 경로.
 *
 * 화면마다 `getSession()` + `redirect()`가 이미 있지만, 그것만 두면 두 가지가
 * 아쉽다.
 *  1) 루트 레이아웃이 먼저 흘러나간 뒤에 리다이렉트가 결정되므로 HTTP 상태가
 *     200이 된다(브라우저는 정상 이동하지만 상태 코드가 사실과 다르다).
 *  2) 새 화면을 추가하면서 검사를 빠뜨리면 그 화면만 조용히 열린다.
 * 그래서 미들웨어에서 한 번 더, 렌더 전에 막는다. 화면 안의 검사는 그대로 둔다 —
 * 둘 중 하나만 남기는 쪽이 오히려 위험하다.
 */
const PUBLIC_PREFIXES = [
  "/vibesafe/login",
  "/vibesafe/signup",
  // 설정 점검 화면 — DB가 안 붙으면 로그인 자체가 안 되므로 로그인 뒤에 둘 수 없다.
  // 대신 그 화면은 비밀값을 한 글자도 내보내지 않는다(setup-status.ts).
  "/vibesafe/setup",
];

export function isProtectedVibesafePath(pathname: string): boolean {
  if (pathname === "/vibesafe" || pathname === "/vibesafe/") return false;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return pathname.startsWith("/vibesafe/");
}
