import { NextResponse } from "next/server";
import { listJobs, patchJobRecord } from "@/lib/jobs-db";
import { listCallLogs } from "@/lib/call-logs";
import { findJobsToUpdateForBooking } from "@/lib/request-status-resolve";
import type { CallRecord } from "@/lib/operations-analytics";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { buildDraftEstimateDoc } from "@/lib/estimate-doc-factory";
import {
  computeEstimateTotals,
  type EstimateDocument,
  type EstimateLineItem,
} from "@/lib/estimate-document";
import { saveShopProfile } from "@/lib/shop-profile-db";

function resolveJob(
  bookingId: string,
  jobs: Awaited<ReturnType<typeof listJobs>>,
  callLogs: Awaited<ReturnType<typeof listCallLogs>>,
) {
  const calls: CallRecord[] = callLogs.map((c) => ({
    id: c.id,
    from: c.from,
    createdAt: c.createdAt,
    jobberRequestId: c.jobberRequestId,
  }));
  return findJobsToUpdateForBooking(bookingId, jobs, calls)[0] ?? null;
}

function sanitizeLineItems(raw: unknown): EstimateLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Partial<EstimateLineItem>;
      const qty = Number(row.qty);
      const unitPriceCents = Math.round(Number(row.unitPriceCents));
      return {
        id: String(row.id || crypto.randomUUID()),
        category:
          row.category === "materials" ||
          row.category === "equipment" ||
          row.category === "fees" ||
          row.category === "other"
            ? row.category
            : "labor",
        description: String(row.description ?? "").trim().slice(0, 200),
        qty: Number.isFinite(qty) && qty > 0 ? qty : 0,
        unit:
          row.unit === "hr" ||
          row.unit === "day" ||
          row.unit === "sf" ||
          row.unit === "lf" ||
          row.unit === "ls"
            ? row.unit
            : "ea",
        unitPriceCents: Number.isFinite(unitPriceCents) ? Math.max(0, unitPriceCents) : 0,
      } satisfies EstimateLineItem;
    })
    .filter((l) => l.description.length > 0);
}

function sanitizeDoc(raw: EstimateDocument, existing?: EstimateDocument): EstimateDocument {
  const lineItems = sanitizeLineItems(raw.lineItems);
  const taxRatePercent = Math.max(0, Math.min(30, Number(raw.taxRatePercent) || 0));
  const now = new Date().toISOString();
  return {
    id: existing?.id || raw.id || crypto.randomUUID(),
    number: existing?.number || raw.number,
    issuedAt: existing?.issuedAt || raw.issuedAt || now,
    validUntil: String(raw.validUntil || existing?.validUntil || now),
    customerName: String(raw.customerName || existing?.customerName || "Customer").slice(0, 80),
    customerPhone: raw.customerPhone?.trim() || existing?.customerPhone,
    customerAddress: raw.customerAddress?.trim() || existing?.customerAddress,
    insuranceCarrier: raw.insuranceCarrier?.trim().slice(0, 80) || undefined,
    claimNumber: raw.claimNumber?.trim().slice(0, 80) || undefined,
    adjusterName: raw.adjusterName?.trim().slice(0, 80) || undefined,
    scopeSummary: raw.scopeSummary?.trim().slice(0, 500) || undefined,
    lineItems,
    taxRatePercent,
    notes: raw.notes?.trim().slice(0, 2000) || undefined,
    exclusions: raw.exclusions?.trim().slice(0, 2000) || undefined,
    paymentTerms: raw.paymentTerms?.trim().slice(0, 500) || undefined,
    shop: {
      shopName: String(raw.shop?.shopName || existing?.shop.shopName || "Shop").slice(0, 80),
      phone: raw.shop?.phone?.trim() || existing?.shop.phone,
      email: raw.shop?.email?.trim() || existing?.shop.email,
      businessAddress: raw.shop?.businessAddress?.trim().slice(0, 200) || undefined,
      licenseNumber: raw.shop?.licenseNumber?.trim().slice(0, 80) || undefined,
      iicrcFirmNumber: raw.shop?.iicrcFirmNumber?.trim().slice(0, 80) || undefined,
    },
    shareToken: existing?.shareToken || raw.shareToken,
    status: existing?.status === "sent" || existing?.status === "accepted"
      ? existing.status
      : "draft",
    sentAt: existing?.sentAt,
    acceptedAt: existing?.acceptedAt,
    updatedAt: now,
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!bookingId) {
    return NextResponse.json({ error: "Job id required" }, { status: 400 });
  }

  const [jobs, callLogs] = await Promise.all([
    listJobs(session.sub),
    listCallLogs(session.sub),
  ]);
  const job = resolveJob(bookingId, jobs, callLogs);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.estimateDoc) {
    const totals = computeEstimateTotals(job.estimateDoc);
    return NextResponse.json({ ok: true, estimate: job.estimateDoc, totals, jobId: job.id });
  }

  const draft = await buildDraftEstimateDoc({ userId: session.sub, job });
  const totals = computeEstimateTotals(draft);
  return NextResponse.json({ ok: true, estimate: draft, totals, jobId: job.id, isNew: true });
}

export async function PATCH(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      estimate?: EstimateDocument;
      saveShopDefaults?: boolean;
    };
    const bookingId = String(body.id ?? "").trim();
    if (!bookingId || !body.estimate) {
      return NextResponse.json({ error: "id and estimate required" }, { status: 400 });
    }

    const [jobs, callLogs] = await Promise.all([
      listJobs(session.sub),
      listCallLogs(session.sub),
    ]);
    const job = resolveJob(bookingId, jobs, callLogs);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const estimate = sanitizeDoc(body.estimate, job.estimateDoc);
    if (estimate.lineItems.length === 0) {
      return NextResponse.json(
        { error: "Add at least one line item before saving." },
        { status: 400 },
      );
    }

    const totals = computeEstimateTotals(estimate);
    const saved = await patchJobRecord(session.sub, job.id, {
      estimateDoc: estimate,
      quotedAmountCents: totals.totalCents,
      quotedAt: estimate.updatedAt,
      requestKind: job.requestKind === "service" ? job.requestKind : "estimate",
    });

    if (body.saveShopDefaults) {
      await saveShopProfile(session.sub, {
        businessAddress: estimate.shop.businessAddress,
        licenseNumber: estimate.shop.licenseNumber,
        iicrcFirmNumber: estimate.shop.iicrcFirmNumber,
        defaultTaxRatePercent: estimate.taxRatePercent,
        estimateNotes: estimate.notes,
        estimateExclusions: estimate.exclusions,
        estimatePaymentTerms: estimate.paymentTerms,
      });
    }

    if (!saved) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      estimate: saved.estimateDoc,
      totals,
      jobId: saved.id,
    });
  } catch (e) {
    console.error("[jobs/estimate-doc PATCH]", e);
    return NextResponse.json({ error: "Failed to save estimate" }, { status: 500 });
  }
}
