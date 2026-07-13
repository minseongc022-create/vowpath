/** Paddle.js client token — safe to expose in the browser (not the API key). */
export function resolvePaddleClientToken(): string | undefined {
  return (
    process.env.PADDLE_CLIENT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ||
    undefined
  );
}

export function resolvePaddleClientEnvironment(): "production" | "sandbox" {
  const env =
    process.env.PADDLE_ENV?.trim() || process.env.NEXT_PUBLIC_PADDLE_ENV?.trim();
  return env === "production" ? "production" : "sandbox";
}
