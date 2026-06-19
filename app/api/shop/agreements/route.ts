import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getAgreementKeeperSettings,
  listAgreements,
  newAgreementId,
  saveAgreement,
} from "@/lib/agreements/store";
import { isRenewingSoon } from "@/lib/agreements/types";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  let agreements = await listAgreements(session.sub);

  if (filter === "renewing") {
    agreements = agreements.filter((a) => isRenewingSoon(a));
  }

  agreements.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
  const settings = await getAgreementKeeperSettings(session.sub);
  const renewingCount = agreements.filter((a) => isRenewingSoon(a)).length;

  return NextResponse.json({ agreements, settings, renewingCount });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const customerName = String(body.customerName ?? "").trim();
    const customerPhone = String(body.customerPhone ?? "").trim();
    const serviceAddress = String(body.serviceAddress ?? "").trim() || "On file";
    const planName = String(body.planName ?? "").trim();
    const startDate = String(body.startDate ?? "").trim();
    const renewalDate = String(body.renewalDate ?? "").trim();

    if (!customerName || !customerPhone || !planName || !startDate || !renewalDate) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const agreement = await saveAgreement({
      id: newAgreementId(),
      userId: session.sub,
      customerName,
      customerPhone,
      customerEmail: body.customerEmail?.trim() || undefined,
      serviceAddress,
      planName,
      annualPriceCents: Math.max(0, Math.round(Number(body.annualPriceCents) || 0)),
      visitsPerYear: Math.max(1, Math.round(Number(body.visitsPerYear) || 2)),
      status: body.status === "draft" ? "draft" : "active",
      startDate,
      renewalDate,
      notes: body.notes?.trim() || undefined,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true, agreement });
  } catch (e) {
    console.error("[shop/agreements POST]", e);
    return NextResponse.json({ error: "Could not create agreement." }, { status: 500 });
  }
}
