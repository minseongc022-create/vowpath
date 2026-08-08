import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensurePin, newSessionToken, saveSession } from "@/lib/content-autopilot/store";

const COOKIE = "autopilot_session";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  const pin = await ensurePin();
  if (!body.pin || body.pin.trim() !== pin) {
    return NextResponse.json({ ok: false, error: "PIN 틀림" }, { status: 401 });
  }
  const token = newSessionToken();
  await saveSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function GET() {
  // Bootstrap pin exists (don't leak full pin in production logs via API)
  await ensurePin();
  return NextResponse.json({ ok: true, needsLogin: true });
}
