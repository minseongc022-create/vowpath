import { NextResponse } from "next/server";
import { listNotificationsForPerson } from "@/dajeong/lib/notification-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

export async function GET(request: Request) {
  const personId = new URL(request.url).searchParams.get("personId")?.trim();
  if (!personId) return NextResponse.json({ error: "personId가 필요해." }, { status: 400 });
  if (!(await verifyClaimedIdentity(personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  const notifications = await listNotificationsForPerson(personId);
  return NextResponse.json({ notifications });
}
