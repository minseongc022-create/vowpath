import { NextResponse } from "next/server";
import { clearMatchCutSessionCookieOptions } from "@/lib/matchcut/auth-token";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearMatchCutSessionCookieOptions());
  return res;
}
