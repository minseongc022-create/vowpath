import { NextResponse } from "next/server";
import {
  getLinkIntakeSession,
  isLinkIntakePortalOpen,
} from "@/lib/call-intake/link-intake-store";
import { getLinkIntakeBookingForSession } from "@/lib/link-intake-portal";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const session = await getLinkIntakeSession(token);
  if (!isLinkIntakePortalOpen(session)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });
  }

  const booking = await getLinkIntakeBookingForSession(session!);
  if (!booking) {
    return NextResponse.json({ error: "접수 내역을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, booking });
}
