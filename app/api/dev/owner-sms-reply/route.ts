import { NextResponse } from "next/server";
import { handleOwnerSmsReply } from "@/lib/owner-sms-reply";
import { getSession } from "@/lib/session";
import { setSmsReplyTarget } from "@/lib/sms-reply-context";
import { getRequestStatuses } from "@/lib/requests-db";
import { findUserById } from "@/lib/users-db";

/** Dev-only: simulate owner texting 1 / 2 / 9 for a booking. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bookingId = "";
  let body = "1";
  try {
    const json = await request.json();
    bookingId = String(json?.bookingId ?? "").trim();
    body = String(json?.body ?? "1").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const account = await findUserById(session.sub);
  const ownerFrom = account?.phone?.trim() || process.env.TWILIO_OWNER_ALERT_PHONE?.trim();
  if (!ownerFrom) {
    return NextResponse.json({ error: "Owner phone not configured" }, { status: 400 });
  }

  await setSmsReplyTarget(session.sub, bookingId);
  const result = await handleOwnerSmsReply({ from: ownerFrom, body });
  const statuses = await getRequestStatuses(session.sub);

  return NextResponse.json({
    ok: true,
    action: result.handled ? body.trim().charAt(0) : null,
    replyBody: result.replyBody,
    handled: result.handled,
    status: statuses[bookingId],
    statuses,
  });
}
