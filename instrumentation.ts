import * as Sentry from "@sentry/nextjs";

/**
 * Next.js가 서버 시작 시 한 번 호출한다(App Router 표준 훅).
 *
 * ★ SENTRY_DSN이 없으면 아무 일도 하지 않는다
 *
 * 이 프로젝트의 다른 선택적 연동(토스 결제, AI 제공자, Vercel KV)과 같은
 * 규칙이다 — 키를 안 넣으면 조용히 꺼진 채로 서비스는 정상 동작해야 한다.
 * 이 파일은 vibesafe 전용이 아니라 이 Next.js 앱 전체(모든 제품)에 적용된다
 * — Sentry SDK 초기화가 라우트 단위로 켜고 끌 수 있는 구조가 아니기 때문이다.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/** App Router가 잡아낸 서버 렌더링 오류까지 Sentry로 보낸다. DSN이 없으면 안전하게 아무 일도 안 한다. */
export const onRequestError = Sentry.captureRequestError;
