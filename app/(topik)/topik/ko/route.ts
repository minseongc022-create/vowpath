import { NextResponse } from "next/server";
import { TOPIK_LOCALE_COOKIE } from "@/topik/lib/i18n/request-locale";

/** GET /topik/ko — set Korean locale cookie and redirect to home */
export function GET(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/topik", url.origin), 307);
  res.cookies.set(TOPIK_LOCALE_COOKIE, "ko", {
    path: "/topik",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
