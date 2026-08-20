import { NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/pricepulse/lib/dashboard/auth.ts";

/**
 * Plain HTML form POST, not a Server Action — a real browser-native
 * navigation with a real 303 response. Avoids any ambiguity around the
 * client Router Cache reusing a stale render for a same-path/different-query
 * redirect, which a Server Action's client-intercepted navigation can hit.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/pricepulse/rank");
  const safeNext = next.startsWith("/pricepulse") ? next : "/pricepulse/rank";

  if (!checkPassword(password)) {
    const url = new URL("/pricepulse/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url, 303);
  }

  await setSessionCookie();
  return NextResponse.redirect(new URL(safeNext, request.url), 303);
}
