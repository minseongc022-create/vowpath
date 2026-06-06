import { NextResponse } from "next/server";
import { buildCalendarEvents } from "@/lib/calendar-events-server";
import { listScheduledBookings } from "@/lib/schedule-bookings-db";
import { fetchJobberScheduleItems } from "@/lib/scheduling/jobber-schedule-api";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") ?? "14")));

    let from: Date;
    let to: Date;

    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
      }
    } else {
      from = new Date();
      to = new Date();
      to.setDate(to.getDate() + days);
    }

    const [native, jobber] = await Promise.all([
      listScheduledBookings(session.sub, from, to),
      fetchJobberScheduleItems(session.sub, from, to),
    ]);

    const events = await buildCalendarEvents(session.sub, native, jobber);

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      native,
      jobber,
      events,
    });
  } catch (e) {
    console.error("[jobber/schedule GET]", e);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}
