import { NextResponse } from "next/server";
import { getCheckoutReadiness } from "@/lib/billing-mode";

/** Public — tells the browser whether checkout can open (no secrets). */
export async function GET() {
  const readiness = getCheckoutReadiness();
  return NextResponse.json(readiness);
}
