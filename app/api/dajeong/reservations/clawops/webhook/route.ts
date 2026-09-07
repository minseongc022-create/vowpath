import { NextResponse } from "next/server";
import { clawOpsConfigured, clawOpsReservationProvider, verifyClawOpsWebhook } from "@/dajeong/lib/clawops-provider";
import { recordClawOpsWebhook, tickReservationQueue, type ProviderCallState } from "@/dajeong/lib/reservation-queue";
import { extractReservationResult } from "@/dajeong/lib/reservation-result-extractor";
import { reservationStateStore } from "@/dajeong/lib/reservation-store";
import { recordAllReservationSuccessAttributions } from "@/dajeong/lib/reservation-attribution";
import { deliverReservationNotifications } from "@/dajeong/lib/reservation-notifications";

function callbackUrl(request: Request): string {
  const incoming = new URL(request.url);
  const base = process.env.HARUWITH_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "");
  return base ? `${base}${incoming.pathname}${incoming.search}` : request.url;
}

function pick(params: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const found = Object.entries(params).find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (found?.[1]) return found[1];
  }
  return undefined;
}

function normalizeStatus(value: string): ProviderCallState["status"] {
  const normalized = value.toLowerCase().replaceAll("_", "-");
  if (normalized === "initiated") return "queued";
  if (normalized === "answered") return "in-progress";
  if (["queued", "ringing", "in-progress", "completed", "failed", "busy", "no-answer", "canceled", "rejected"].includes(normalized)) return normalized as ProviderCallState["status"];
  return "failed";
}

export async function POST(request: Request) {
  if (!clawOpsConfigured()) return NextResponse.json({ error: "ClawOps webhook 설정이 준비되지 않았어요." }, { status: 503 });
  const contentType = request.headers.get("content-type") ?? "";
  const params: Record<string, string> = {};
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => ({})) as Record<string, unknown>;
    for (const [key, value] of Object.entries(json)) if (value != null && typeof value !== "object") params[key] = String(value);
  } else {
    const form = await request.formData();
    for (const [key, value] of form.entries()) if (typeof value === "string") params[key] = value;
  }
  const signature = request.headers.get("x-signature") ?? "";
  if (!signature || !verifyClawOpsWebhook(callbackUrl(request), params, signature)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  const callId = pick(params, "CallId", "callId");
  const statusValue = pick(params, "CallStatus", "status");
  if (!callId || !statusValue) return NextResponse.json({ error: "CallId와 CallStatus가 필요해요." }, { status: 400 });
  const duration = Number(pick(params, "CallDuration", "duration"));
  const sip = Number(pick(params, "SipResponseCode", "sipResponseCode"));
  const status = normalizeStatus(statusValue);
  const recorded = await recordClawOpsWebhook(reservationStateStore, {
    callId,
    status,
    durationSeconds: Number.isFinite(duration) ? duration : undefined,
    hangupCause: pick(params, "HangupCause", "hangupCause"),
    hangupSource: pick(params, "HangupSource", "hangupSource"),
    sipResponseCode: Number.isFinite(sip) ? sip : undefined,
    eventKey: `${callId}:${status}:${pick(params, "Timestamp", "dateUpdated") ?? "none"}:${Number.isFinite(duration) ? duration : 0}`,
  });
  if (clawOpsConfigured() && ["completed", "failed", "busy", "no-answer", "canceled", "rejected"].includes(status)) {
    await tickReservationQueue(reservationStateStore, clawOpsReservationProvider, { capacity: Number(process.env.HARUWITH_RESERVATION_CONCURRENCY ?? 1), extractResult: extractReservationResult }).catch(() => undefined);
    await recordAllReservationSuccessAttributions(await reservationStateStore.read()).catch(() => undefined);
    await deliverReservationNotifications(reservationStateStore).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, duplicate: recorded.duplicate });
}
