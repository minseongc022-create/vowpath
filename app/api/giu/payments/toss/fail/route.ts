import { NextResponse } from "next/server";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";

/** Toss failUrl — send customer back with a readable error. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId")?.trim();
  const message = url.searchParams.get("message")?.trim() ?? "결제가 취소되었습니다";
  const origin = getGiuPublicOrigin();

  if (orderId) {
    return NextResponse.redirect(
      `${origin}/dat/${orderId}?pay=cancelled&msg=${encodeURIComponent(message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/hop?pay=cancelled`);
}
