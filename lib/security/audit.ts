import { appendTenantEvent } from "@/lib/tenant-events";

export type SecurityAuditEvent =
  | "login_success"
  | "login_failed"
  | "login_rate_limited"
  | "password_reset_requested";

export async function recordSecurityAudit(params: {
  userId?: string;
  event: SecurityAuditEvent;
  ip?: string;
  detail?: string;
}): Promise<void> {
  const userId = params.userId ?? "system";
  try {
    await appendTenantEvent({
      userId,
      type: "security",
      title: params.event,
      body: [params.ip, params.detail].filter(Boolean).join(" - ") || params.event,
      href: undefined,
      bookingId: undefined,
      callId: undefined,
      urgency: "low",
    });
  } catch (e) {
    console.warn("[security-audit]", params.event, e);
  }
}
