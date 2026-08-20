import { NextResponse } from "next/server";
import { registerSeller, setSessionCookie } from "@/pricepulse/lib/dashboard/auth.ts";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");

  const result = await registerSeller({ email, password, displayName });
  if ("error" in result) {
    const url = new URL("/pricepulse/signup", request.url);
    url.searchParams.set("error", encodeURIComponent(result.error));
    return NextResponse.redirect(url, 303);
  }

  await setSessionCookie({ sellerId: result.seller.id, email: result.seller.email });
  // First login has nothing to show yet — send them straight to add a keyword.
  return NextResponse.redirect(new URL("/pricepulse/keywords?welcome=1", request.url), 303);
}
