import { NextResponse } from "next/server";
import { fetchJobberRequestsInRange } from "@/lib/jobber-api";

export const maxDuration = 25;
import { getJobberTokens } from "@/lib/jobber-tokens";
import { parseDateInput, toDateInputValue } from "@/lib/dashboard-analytics";
import { getSession } from "@/lib/session";
import { recordJobberSyncFailed } from "@/lib/record-tenant-events";

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await getJobberTokens(session.sub);
  if (!tokens) {
    return NextResponse.json({
      connected: false,
      accountName: null,
      bookings: [],
      syncedAt: null,
    });
  }

  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  let start: Date;
  let end: Date;

  if (startParam && endParam) {
    const parsedStart = parseDateInput(startParam);
    const parsedEnd = parseDateInput(endParam);
    if (!parsedStart || !parsedEnd || parsedStart > parsedEnd) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    start = parsedStart;
    end = new Date(parsedEnd);
    end.setHours(23, 59, 59, 999);
  } else {
    ({ start, end } = defaultRange());
  }

  try {
    const bookings = await fetchJobberRequestsInRange(session.sub, start, end);
    return NextResponse.json({
      connected: true,
      accountName: tokens.accountName ?? null,
      bookings,
      syncedAt: new Date().toISOString(),
      range: {
        start: toDateInputValue(start),
        end: toDateInputValue(end),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch Jobber data";
    if (message !== "JOBBER_NOT_CONNECTED") {
      console.warn("[jobber/bookings GET]", message);
    }
    if (message === "JOBBER_NOT_CONNECTED") {
      return NextResponse.json({
        connected: false,
        accountName: null,
        bookings: [],
      });
    }
    try {
      await recordJobberSyncFailed({ userId: session.sub, message });
    } catch (logErr) {
      console.warn("[jobber/bookings] tenant event", logErr);
    }

    return NextResponse.json(
      {
        connected: true,
        accountName: tokens.accountName ?? null,
        bookings: [],
        syncedAt: new Date().toISOString(),
        error: message,
      },
      { status: 502 },
    );
  }
}
