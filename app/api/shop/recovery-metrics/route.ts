import { NextResponse } from "next/server";
import { listCallLogs } from "@/lib/call-logs";
import { parseDateInput } from "@/lib/dashboard-analytics";
import { listInboundEvents } from "@/lib/inbound-events";
import { buildRecoveryMetrics } from "@/lib/recovery-roi";
import { getRequestStatuses } from "@/lib/requests-db";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { getSession } from "@/lib/session";
import type { CallRecord } from "@/lib/operations-analytics";

function toCallRecord(c: Awaited<ReturnType<typeof listCallLogs>>[number]): CallRecord {
  return {
    id: c.id,
    from: c.from,
    transcript: c.transcript,
    priority: c.priority,
    symptom: c.symptom,
    customerName: c.customerName,
    address: c.address,
    aiSummary: c.aiSummary,
    verificationComplete: c.verificationComplete,
    jobberRequestId: c.jobberRequestId,
    callSid: c.callSid,
    createdAt: c.createdAt,
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const startRaw = url.searchParams.get("start");
  const endRaw = url.searchParams.get("end");

  const end = parseDateInput(endRaw ?? "") ?? new Date();
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  const defaultStart = new Date(endDay);
  defaultStart.setDate(defaultStart.getDate() - 29);
  defaultStart.setHours(0, 0, 0, 0);
  const start = parseDateInput(startRaw ?? "") ?? defaultStart;

  try {
    const userId = session.sub;
    const [settings, callsRaw, requestStatuses, inboundEvents] = await Promise.all([
      getShopBookingSettings(userId),
      listCallLogs(userId),
      getRequestStatuses(userId),
      listInboundEvents(userId, { since: start }),
    ]);

    const metrics = buildRecoveryMetrics({
      calls: callsRaw.map(toCallRecord),
      requestStatuses,
      inboundEvents,
      shadowModeRemaining: settings.shadowModeRemaining,
      start,
      end: endDay,
    });

    return NextResponse.json({ metrics });
  } catch (e) {
    console.error("[shop/recovery-metrics]", e);
    return NextResponse.json({ error: "Failed to load recovery metrics" }, { status: 500 });
  }
}
