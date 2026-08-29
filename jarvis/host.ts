/**
 * 자비스가 사는 도메인
 *
 * ★ effiroad.com이 아니라 giucuu.com이다
 *
 * effiroad.com은 예전에 미국 복원·냉난방 업체 전화를 대신 받는 AI 서비스
 * 자리였다. 그 시절 흔적(가입자·옛 링크·같은 키로 서명된 세션)이 남아 있어,
 * 자비스를 거기 두면 계속 옛것과 얽힌다. 그래서 도메인을 통째로 옮기고
 * effiroad.com은 아무것도 없는 상태로 비운다.
 *
 * ⚠️ 이 상수를 바꾸면 **검수 문자 링크도 같이 바뀐다**(jarvis/engine/notify.ts).
 * 문자에 적힌 주소와 실제 서비스 주소가 어긋나면 사장님이 링크를 눌러도
 * 아무것도 안 뜬다 — 한 곳에서만 정하는 이유다.
 */

import { normalizeHostname } from "@/lib/canonical-host";

/** 환경변수로 덮어쓸 수 있게 둔다 — 도메인을 또 옮길 때 코드를 안 고치려고 */
export const JARVIS_HOST = (process.env.NEXT_PUBLIC_JARVIS_HOST?.trim() || "giucuu.com")
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .replace(/^www\./, "");

const JARVIS_HOSTS = new Set([JARVIS_HOST, `www.${JARVIS_HOST}`]);

export function isJarvisHost(host: string | null | undefined): boolean {
  return JARVIS_HOSTS.has(normalizeHostname(host));
}

/**
 * 바깥에 알려줄 주소 — **www가 붙는다**.
 *
 * ★ 왜 apex(giucuu.com)가 아닌가
 *
 * 이 도메인은 Vercel 쪽 설정에서 apex → www로 308 리다이렉트가 걸려 있다.
 * 미들웨어가 보기도 전에 플랫폼이 먼저 튕긴다. 브라우저는 리다이렉트를
 * 따라가니 문자 링크는 apex여도 열리지만, **크론처럼 리다이렉트를 안 따라가는
 * 호출은 308에서 그대로 멈춘다** — 실제로 자비스 크론이 이것 때문에 죽었다.
 * 그래서 기계가 부를 주소는 처음부터 www로 준다.
 */
export const JARVIS_PUBLIC_ORIGIN = (
  process.env.NEXT_PUBLIC_JARVIS_URL?.trim() || `https://www.${JARVIS_HOST}`
).replace(/\/$/, "");

/** 문자·알림·크론에 넣을 절대 주소 */
export function jarvisUrl(pathname: string, search = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${JARVIS_PUBLIC_ORIGIN}${path}${search}`;
}
