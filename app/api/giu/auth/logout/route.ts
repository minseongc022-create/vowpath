import { NextResponse } from "next/server";
import { clearGiuSessionCookieOptions } from "@/giu/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearGiuSessionCookieOptions());
  return response;
}
