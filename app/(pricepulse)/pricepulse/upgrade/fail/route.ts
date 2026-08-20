import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const message = url.searchParams.get("message")?.trim() || "결제가 취소되었습니다";
  const target = new URL("/pricepulse/upgrade", request.url);
  target.searchParams.set("error", encodeURIComponent(message));
  return NextResponse.redirect(target);
}
