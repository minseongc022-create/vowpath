import { shouldTenantAnswerNow } from "./answer-schedule";

export function parseAfterHoursParam(url: string | URL): boolean {
  const u = typeof url === "string" ? new URL(url, "http://local") : url;
  const v = u.searchParams.get("afterHours");
  return v === "1" || v === "true";
}

export function withAfterHoursParam(url: string, afterHours: boolean): string {
  if (!afterHours) return url;
  const u = new URL(url, "http://local");
  u.searchParams.set("afterHours", "1");
  return `${u.pathname}${u.search}`;
}

/** Full URL variant for Twilio action URLs. */
export function appendAfterHoursToWebhookUrl(baseUrl: string, afterHours: boolean): string {
  if (!afterHours) return baseUrl;
  return baseUrl.includes("?")
    ? `${baseUrl}&afterHours=1`
    : `${baseUrl}?afterHours=1`;
}

export async function resolveAfterHoursForTenant(
  userId: string,
  requestUrl?: string,
): Promise<boolean> {
  if (requestUrl && parseAfterHoursParam(requestUrl)) return true;
  const withinSchedule = await shouldTenantAnswerNow(userId);
  return !withinSchedule;
}

export function afterHoursChannelIntro(shopName: string): string {
  return (
    `Thank you for calling ${shopName}. ` +
    `We're outside our regular office hours right now. ` +
    `We'll take your service request now, and our team will review it and contact you during the next business day. ` +
    `This is not a confirmed appointment. ` +
    `For faster intake, press 1 to receive a text link. Or stay on the line to continue by phone.`
  );
}

export function afterHoursMenuIntro(priority: "P1" | "P2" | "P3"): string {
  const base =
    "We're outside office hours, but we've recorded your request. Our team will follow up during the next business day. ";
  if (priority === "P1") {
    return (
      base +
      "Emergency line selected. If you have no heat, no cool, or a safety issue, describe it now and we'll flag this as urgent for review."
    );
  }
  if (priority === "P2") {
    return base + "Same-day comfort issue selected. Please describe your problem.";
  }
  return base + "Routine service selected. Please describe what you need.";
}

export function afterHoursGoodbyeMessage(hasSlot?: boolean): string {
  if (hasSlot) {
    return (
      "Your preferred visit window is noted. Our team will confirm during business hours. " +
      "This is not a confirmed appointment until we contact you. Goodbye."
    );
  }
  return (
    "Your request has been received. Our team will review it and contact you during the next business day. " +
    "This is not a confirmed appointment. Goodbye."
  );
}
