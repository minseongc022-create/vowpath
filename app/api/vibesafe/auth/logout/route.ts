import { NextResponse } from "next/server";
import { clearSessionCookieOptions, VIBESAFE_SESSION_COOKIE } from "@/vibesafe/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true, redirect: "/vibesafe" });
  response.cookies.set(VIBESAFE_SESSION_COOKIE, "", clearSessionCookieOptions());
  return response;
}

export const dynamic = "force-dynamic";
