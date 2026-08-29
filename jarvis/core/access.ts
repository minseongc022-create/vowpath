/**
 * 자비스 접근 제한 — 소유자 한 명만
 *
 * ★ 왜 필요한가
 *
 * 자비스 저장소(store.ts)는 가맹점별로 나뉘지 않은 **하나의 전역 상태**다.
 * 여러 셀러가 각자 쓰는 SaaS가 아니라 사장님 한 명의 자동화이기 때문에
 * 그렇게 지었다. 그런데 로그인 라우트(토스샵 회원가입)는 원래 누구나
 * 이메일만 있으면 계정을 만들 수 있었다 — 로그인만 되면 그 사람도
 * 사장님의 대화·목표·전화번호·연동 상태를 그대로 보고 바꿀 수 있었다.
 *
 * 로그인 라우트 자체를 소유자 이메일로 막았지만(app/api/toss-shop/auth/login),
 * **여기서도 한 번 더 확인한다.** 로그인 단계의 방어가 나중에 실수로
 * 풀리거나, 옛 세션 쿠키가 남아 있어도 자비스 API는 그 자체로 안전해야
 * 한다 — 문을 하나만 잠그면 그 문 하나가 실수로 열렸을 때 전부 뚫린다.
 */

import { isOwnerEmail } from "@/toss-shop/lib/billing";
import type { TossShopSessionPayload } from "@/toss-shop/lib/auth";

export function isOwnerSession(
  session: TossShopSessionPayload | null,
): session is TossShopSessionPayload {
  return session != null && isOwnerEmail(session.email);
}
