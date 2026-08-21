import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { clearTossShopSessionCookieOptions } from "@/toss-shop/lib/auth";

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearTossShopSessionCookieOptions());
  return res;
}
