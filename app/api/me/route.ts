import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** 개발용: TWILIO_DEFAULT_USER_ID 에 넣을 user id */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    userId: session.sub,
    email: session.email,
    shopName: session.shopName,
  });
}
