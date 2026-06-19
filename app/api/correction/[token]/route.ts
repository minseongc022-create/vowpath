import { NextResponse } from "next/server";
import {
  getCorrectionSession,
  isCorrectionSessionValid,
  markCorrectionSessionUsed,
} from "@/lib/correction-intake-store";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { buildCorrectionBookingView } from "@/lib/customer-verification/submit-correction";
import { submitCustomerVerificationCorrection } from "@/lib/customer-verification/submit-correction";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const session = await getCorrectionSession(token);
    if (!isCorrectionSessionValid(session)) {
      return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });
    }
    const shopName = await shopDisplayNameForUser(session!.userId);
    const booking = await buildCorrectionBookingView(session!);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, shopName, booking });
  } catch (e) {
    console.error("[correction GET]", e);
    return NextResponse.json({ error: "Failed to load correction link" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const session = await getCorrectionSession(token);
  if (!isCorrectionSessionValid(session)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });
  }

  const body = (await request.json()) as {
    customerName?: string;
    address?: string;
    issueDescription?: string;
  };

  const result = await submitCustomerVerificationCorrection({
    session: session!,
    customerName: String(body.customerName ?? "").trim(),
    address: String(body.address ?? "").trim(),
    issueType: String(body.issueDescription ?? "").trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await markCorrectionSessionUsed(token);
  return NextResponse.json({ ok: true, booking: result.booking });
}
