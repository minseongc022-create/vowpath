/**
 * 누가 들어올 수 있는가 — 사장님 한 명뿐
 *
 * ★ 왜 로그인만으로는 부족한가
 *
 * 자비스의 저장소(jarvis/core/store.ts)는 가맹점별로 나뉘지 않은 **하나의
 * 전역 상태**다. 여러 셀러가 각자의 상점을 여는 SaaS가 아니라, 사장님
 * 한 명의 대화·목표·전화번호·연동 설정을 담는 곳이라 그렇게 설계했다.
 *
 * 그래서 "로그인된 사람"이 아니라 "소유자인가"를 물어야 한다. 실제로
 * 회원가입이 한동안 열려 있어, 아무나 가입만 하면 사장님의 자비스 화면을
 * 그대로 보고 설정까지 바꿀 수 있던 구멍이 있었다.
 *
 * 로그인 라우트에서 한 번 막고, 자비스의 모든 화면·API에서 이 함수로 한 번
 * 더 막는다 — 문 하나만 잠그면 그 문이 실수로 열렸을 때 전부 뚫린다.
 */

import type { JarvisSession } from "./session";

/**
 * 소유자 이메일 목록 — 환경변수 TOSS_SHOP_OWNER_EMAILS.
 *
 * 이름은 옛 흔적이지만 Vercel에 이미 이 이름으로 설정돼 있다. 이름을 바꾸면
 * 환경변수를 새로 넣기 전까지 **사장님 본인도 못 들어온다** — 자비스가
 * 전역 상태인 이상 그건 잠기는 게 아니라 서비스가 멈추는 것이다.
 *
 * 비어 있으면 아무도 통과하지 못한다(fail-closed). 설정이 빠졌을 때
 * 전부 열리는 것보다 전부 막히는 쪽이 안전하다.
 */
function ownerEmails(): string[] {
  const raw = process.env.TOSS_SHOP_OWNER_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  return ownerEmails().includes(email.trim().toLowerCase());
}

export function isOwnerSession(
  session: JarvisSession | null,
): session is JarvisSession {
  return session != null && isOwnerEmail(session.email);
}
