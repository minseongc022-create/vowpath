import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  deleteAgreement,
  getAgreement,
  saveAgreement,
} from "@/lib/agreements/store";
import type { AgreementStatus } from "@/lib/agreements/types";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agreement = await getAgreement(session.sub, id);
  if (!agreement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ agreement });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getAgreement(session.sub, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const next = { ...existing, updatedAt: new Date().toISOString() };

    if (typeof body.customerName === "string" && body.customerName.trim()) {
      next.customerName = body.customerName.trim();
    }
    if (typeof body.customerPhone === "string" && body.customerPhone.trim()) {
      next.customerPhone = body.customerPhone.trim();
    }
    if (typeof body.serviceAddress === "string") {
      next.serviceAddress = body.serviceAddress.trim() || "On file";
    }
    if (typeof body.planName === "string" && body.planName.trim()) {
      next.planName = body.planName.trim();
    }
    if (typeof body.annualPriceCents === "number") {
      next.annualPriceCents = Math.max(0, Math.round(body.annualPriceCents));
    }
    if (typeof body.visitsPerYear === "number") {
      next.visitsPerYear = Math.max(1, Math.round(body.visitsPerYear));
    }
    if (typeof body.startDate === "string" && body.startDate.trim()) {
      next.startDate = body.startDate.trim();
    }
    if (typeof body.renewalDate === "string" && body.renewalDate.trim()) {
      next.renewalDate = body.renewalDate.trim();
    }
    if (typeof body.notes === "string") {
      next.notes = body.notes.trim() || undefined;
    }
    if (typeof body.lastVisitDate === "string") {
      next.lastVisitDate = body.lastVisitDate.trim() || undefined;
    }
    const validStatuses: AgreementStatus[] = ["draft", "active", "expired", "cancelled"];
    if (validStatuses.includes(body.status)) {
      next.status = body.status;
    }

    const agreement = await saveAgreement(next);
    return NextResponse.json({ ok: true, agreement });
  } catch (e) {
    console.error("[shop/agreements PATCH]", e);
    return NextResponse.json({ error: "Could not update agreement." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteAgreement(session.sub, id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
