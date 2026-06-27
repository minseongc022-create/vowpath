import { NextResponse } from "next/server";
import { listCallLogs } from "@/lib/call-logs";
import { buildDispatchPacket } from "@/lib/dispatch-packet";
import { resolveShopDisplayName } from "@/lib/link-intake-brand";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/users-db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId")?.trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const user = await findUserById(session.sub);
  const shopName = resolveShopDisplayName(user?.shopName);
  const calls = await listCallLogs(session.sub);

  let call = null;
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    call = calls.find((c) => c.id === callId) ?? null;
  } else {
    call = calls.find((c) => `call-${c.id}` === bookingId) ?? calls[0] ?? null;
  }

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const packet = buildDispatchPacket({
    bookingId,
    shopName,
    call,
  });

  return NextResponse.json(packet);
}
