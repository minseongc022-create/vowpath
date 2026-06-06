import { NextResponse } from "next/server";
import {
  REQUEST_STATUSES,
  normalizeRequestStatus,
  type RequestStatus,
} from "@/lib/booking-policy";
import { getBookingRequestStatuses } from "@/lib/booking-status";
import { verifyBookingBelongsToTenant } from "@/lib/booking-ownership";
import {
  BookingStatusTransitionError,
  persistRequestStatusForBooking,
} from "@/lib/booking-status-sync";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    const statuses = await getBookingRequestStatuses(session.sub);

    if (id) {
      return NextResponse.json({ id, status: statuses[id] ?? null });
    }

    return NextResponse.json({ statuses });
  } catch (e) {
    console.error("[bookings/status GET]", e);
    if (e instanceof Error && e.message === "KV_TIMEOUT") {
      return NextResponse.json(
        { error: "Status storage timed out. Retry shortly.", statuses: {} },
        { status: 503 },
      );
    }
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Server storage not configured. Connect Vercel KV.", statuses: {} },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to load statuses" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body?.id ?? "").trim();
    const status = normalizeRequestStatus(body?.status);

    if (!id) {
      return NextResponse.json({ error: "Booking id required" }, { status: 400 });
    }

    if (!REQUEST_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const owned = await verifyBookingBelongsToTenant(session.sub, id);
    if (!owned) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const statuses = await persistRequestStatusForBooking(session.sub, id, status);
    const effectiveStatus = statuses[id] ?? status;
    return NextResponse.json({ ok: true, id, status: effectiveStatus, statuses });
  } catch (e) {
    console.error("[bookings/status PATCH]", e);
    if (e instanceof BookingStatusTransitionError) {
      const msg =
        e.code === "CANNOT_APPROVE"
          ? "이미 처리되었거나 승인할 수 없는 상태입니다."
          : e.code === "CANNOT_REJECT"
            ? "이미 처리되었거나 거절할 수 없는 상태입니다."
            : e.code === "CANNOT_SCHEDULE"
              ? "일정 확정은 승인된 요청만 가능합니다."
              : "완료 처리는 승인·일정 확정된 요청만 가능합니다.";
      return NextResponse.json(
        { error: msg, code: e.code, fromStatus: e.fromStatus },
        { status: 409 },
      );
    }
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Server storage not configured. Connect Vercel KV." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
