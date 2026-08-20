import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/pricepulse/lib/dashboard/auth.ts";

export async function GET(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/pricepulse/login", request.url));
}
