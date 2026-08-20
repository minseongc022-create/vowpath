/**
 * Failure alerting. The one operational lever that still works from a barracks:
 * if collection breaks, a message has to leave the building. Webhook target is
 * intentionally generic JSON (Slack/Discord/Make → KakaoTalk all accept it).
 */
import { getRuntimeConfig } from "./config.ts";

export type AlertSeverity = "info" | "warn" | "critical";

export type Alert = {
  severity: AlertSeverity;
  /** Dedupe key — same key inside the window sends once. */
  key: string;
  title: string;
  detail?: string;
  context?: Record<string, unknown>;
};

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const recent = new Map<string, number>();

export function shouldSend(key: string, now = Date.now(), windowMs = DEDUPE_WINDOW_MS): boolean {
  const last = recent.get(key);
  if (last && now - last < windowMs) return false;
  recent.set(key, now);
  return true;
}

/** Test seam — collection runs are long-lived processes on some hosts. */
export function resetAlertDedupe(): void {
  recent.clear();
}

export function formatAlert(alert: Alert): string {
  const icon = alert.severity === "critical" ? "🚨" : alert.severity === "warn" ? "⚠️" : "ℹ️";
  const lines = [`${icon} [pricepulse] ${alert.title}`];
  if (alert.detail) lines.push(alert.detail);
  if (alert.context && Object.keys(alert.context).length) {
    lines.push(
      Object.entries(alert.context)
        .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
        .join(" "),
    );
  }
  return lines.join("\n");
}

export async function sendAlert(alert: Alert): Promise<{ sent: boolean; reason?: string }> {
  const text = formatAlert(alert);
  if (alert.severity === "critical") console.error(text);
  else console.warn(text);

  if (!shouldSend(`${alert.severity}|${alert.key}`)) return { sent: false, reason: "deduped" };

  const { alertWebhook } = getRuntimeConfig();
  if (!alertWebhook) return { sent: false, reason: "no PRICEPULSE_ALERT_WEBHOOK configured" };

  try {
    const response = await fetch(alertWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, content: text, severity: alert.severity, ...alert.context }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { sent: false, reason: `webhook ${response.status}` };
    return { sent: true };
  } catch (error) {
    console.error("[pricepulse] alert webhook failed:", (error as Error).message);
    return { sent: false, reason: (error as Error).message };
  }
}
