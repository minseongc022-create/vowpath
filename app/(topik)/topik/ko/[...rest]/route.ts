import { NextResponse } from "next/server";
import { TOPIK_LOCALE_COOKIE } from "@/topik/lib/i18n/request-locale";

/** GET /topik/ko/* — set Korean cookie and redirect to matching /topik path */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ rest: string[] }> },
) {
  const { rest } = await params;
  const url = new URL(request.url);
  const target = `/topik/${rest.join("/")}`;
  const res = NextResponse.redirect(new URL(target, url.origin), 307);
  res.cookies.set(TOPIK_LOCALE_COOKIE, "ko", {
    path: "/topik",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
