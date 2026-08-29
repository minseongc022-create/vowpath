/**
 * 문 — 사장님이 아니면 로그인 화면 말고는 아무것도 못 본다
 *
 * ★ 왜 미들웨어에서 막는가
 *
 * 자비스는 화면과 API마다 소유자 검사를 한다. 그건 그대로 두되, 그보다
 * **앞에서** 한 번 더 막는다. 검사를 빠뜨린 라우트가 하나라도 생기면 그
 * 라우트만 뚫리는 게 아니라 자비스 전체가 뚫리기 때문이다 — 자비스의
 * 저장소는 가맹점별로 나뉘지 않은 하나의 전역 상태다.
 *
 * ★ effiroad.com의 과거
 *
 * 이 도메인은 예전에 미국 복원·냉난방 업체의 전화를 대신 받는 AI 서비스
 * 자리였다. 그때 가입한 사람이 남아 있을 수 있고, 그 서비스의 세션은
 * 자비스와 같은 AUTH_SECRET으로 서명됐다(그래서 세션 쪽에 iss/aud를 박아
 * 따로 막았다). 여기서는 그와 별개로, **소유자가 아닌 모든 요청을 라우트에
 * 닿기 전에** 끊는다.
 *
 * ★ 리다이렉트가 아니라 404인 이유
 *
 * "로그인하세요"로 돌려보내면 그 경로에 무언가 있다는 걸 알려주는 셈이다.
 * 없는 것처럼 보이는 편이 낫다 — 사장님은 어차피 로그인 주소를 안다.
 */

/**
 * 사람이 아니라 기계가 부르는 곳 — 각자 비밀키·서명으로 스스로를 지킨다.
 *
 * ⚠️ `/api/cron/`을 막으면 **구쿠(giucuu.com)의 예약 만료 크론이 멈춘다** —
 * 그 크론은 `effiroad.com/api/cron/giu-reservation-expiry`로 들어온다.
 * 결제 안 된 예약이 안 풀려서 재고가 잠긴다. 여기 목록을 줄일 때는 실제로
 * 무엇이 이 도메인으로 들어오는지(config/cron.schedule.json) 먼저 봐야 한다.
 */
const MACHINE_CALLED_PREFIXES = [
  "/api/cron/", // 크론 전부 — CRON_SECRET로 각자 막는다(구쿠 것 포함)
  "/api/jarvis/cron", // 자비스 자동 운전 — CRON_SECRET
  "/api/lemon-squeezy/webhook", // 외부 결제 웹훅 — 서명 검증
];

/** 로그인하기 위해 반드시 열려 있어야 하는 것 */
const LOGIN_PATHS = ["/login", "/api/jarvis/login"];

/** 화면이 그려지려면 필요한 정적 파일 */
function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|svg|webp|woff2?|txt|xml|json|webmanifest|css|js|map)$/.test(pathname)
  );
}

/**
 * 로그인 안 한 사람에게도 열어줄 경로인가.
 *
 * 여기서 true가 아니면 전부 막힌다 — 새 라우트를 추가할 때 자동으로
 * 잠기는 쪽이 기본값이어야 한다(빠뜨려서 열리는 것보다 낫다).
 */
export function isPublicJarvisPath(pathname: string): boolean {
  if (isStaticAsset(pathname)) return true;
  if (LOGIN_PATHS.includes(pathname)) return true;
  return MACHINE_CALLED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}
