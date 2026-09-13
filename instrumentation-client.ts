import * as Sentry from "@sentry/nextjs";

/**
 * 브라우저에서 실행되는 코드는 `NEXT_PUBLIC_` 접두사가 붙은 환경변수만
 * 읽을 수 있다(Next.js가 빌드 시 값을 번들에 박아 넣는 방식이라 서버 전용
 * 값은 애초에 클라이언트 번들에 들어가지 않는다) — 그래서 서버용
 * SENTRY_DSN과 별개로 NEXT_PUBLIC_SENTRY_DSN이 따로 필요하다. 보통 같은
 * 값을 두 번 넣으면 된다.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
  });
}
