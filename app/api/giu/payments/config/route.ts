import { NextResponse } from "next/server";
import { giuPaymentStatus } from "@/giu/lib/payments";

/** Public checkout mode for Giu client UI (no secrets). */
export async function GET() {
  const status = giuPaymentStatus();
  return NextResponse.json(status);
}
