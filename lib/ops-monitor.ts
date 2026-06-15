/**
 * Lightweight ops hook — extend with Sentry/Datadog when DSN env vars are set.
 */
export function captureOpsException(
  context: string,
  error: unknown,
  extra?: Record<string, string>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ops-monitor] ${context}`, message, extra ?? {});
}

export function captureOpsMessage(
  context: string,
  message: string,
  extra?: Record<string, string>,
): void {
  console.warn(`[ops-monitor] ${context}`, message, extra ?? {});
}
