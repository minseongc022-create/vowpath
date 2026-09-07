import { NextResponse } from "next/server";
import { reservationMetrics } from "@/dajeong/lib/reservation-metrics";
import { reservationPersistenceMode, reservationStateStore } from "@/dajeong/lib/reservation-store";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!process.env.HARUWITH_OPS_TOKEN || token !== process.env.HARUWITH_OPS_TOKEN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = await reservationStateStore.read();
  return NextResponse.json({ metrics: reservationMetrics(state), persistence: reservationPersistenceMode(), measuredAt: new Date().toISOString() });
}
