import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTechAssignment } from "@/lib/tech-dispatch/store";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = new URL(request.url).searchParams.get("bookingId")?.trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const assignment = await getTechAssignment(session.sub, bookingId);
  return NextResponse.json({ assignment });
}
