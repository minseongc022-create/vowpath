import { NextResponse } from "next/server";
import { acceptAgreementOffer } from "@/lib/agreements/offer-flow";
import { getAgreementOfferSession } from "@/lib/agreements/offer-store";
import { formatAgreementPrice } from "@/lib/agreements/types";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const session = await getAgreementOfferSession(token);
  if (!session) {
    return NextResponse.json({ error: "expired" }, { status: 404 });
  }

  const shopName = await shopDisplayNameForUser(session.userId);

  return NextResponse.json({
    shopName,
    customerName: session.customerName,
    planName: session.planName,
    annualPrice: formatAgreementPrice(session.annualPriceCents),
    visitsPerYear: session.visitsPerYear,
    serviceAddress: session.serviceAddress,
    expiresAt: session.expiresAt,
    used: Boolean(session.usedAt),
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const result = await acceptAgreementOffer(token);
  if (!result.ok) {
    const status = result.error === "expired" ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, agreement: result.agreement });
}
