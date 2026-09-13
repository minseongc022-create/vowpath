import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // 로컬 개발 중 에러까지 보내면 노이즈만 커진다 — 실제 운영에서만 켠다.
  enabled: process.env.NODE_ENV === "production",
});
