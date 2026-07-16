import { NextResponse } from "next/server";
import { apiErrorsEn } from "@/lib/api-errors-en";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { submitLinkIntakeForm } from "@/lib/call-intake/link-intake-flow";
import {
  canSubmitLinkIntakeForm,
  isLinkIntakePortalOpen,
} from "@/lib/call-intake/link-intake-store";
import { requireLinkIntakeSession } from "@/lib/call-intake/link-intake-route-guard";
import { saveIntakePhoto } from "@/lib/intake-photo-store";
import { parseLinkUrgency } from "@/lib/link-intake-urgency";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";
import { parseCustomerSmsConsent, parseCustomerMarketingSmsConsent, buildCustomerSmsConsentRecord } from "@/lib/legal-consent";
import { withDistributedLock } from "@/lib/distributed-lock";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const guard = await guardPublicIntakeRoute(request, token);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const sessionGuard = await requireLinkIntakeSession(token);
  if (!sessionGuard.ok) {
    if (sessionGuard.status === 404) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }
    return NextResponse.json(
      { error: sessionGuard.error, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }
  const session = sessionGuard.session;
  const shopName = await shopDisplayNameForUser(session.userId);
  const mode = canSubmitLinkIntakeForm(session)
    ? "form"
    : isLinkIntakePortalOpen(session)
      ? "portal"
      : "expired";
  return NextResponse.json({
    valid: mode !== "expired",
    mode,
    expiresAt: session.expiresAt,
    shopName,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const guard = await guardPublicIntakeRoute(request, token);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const sessionGuard = await requireLinkIntakeSession(token);
  if (!sessionGuard.ok) {
    return NextResponse.json(
      { error: sessionGuard.error, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }
  const session = sessionGuard.session;

  const contentType = request.headers.get("content-type") ?? "";

  let customerName = "";
  let address = "";
  let issueDescription = "";
  let urgencyRaw: unknown = "this_week";
  let photoRef: string | undefined;
  let slotId: string | undefined;
  let insuranceCarrier = "";
  let insuranceClaimNumber = "";
  let waterSource = "";
  let activeLoss = false;
  let smsConsent = false;
  let smsMarketingConsent = false;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    customerName = String(form.get("customerName") ?? "").trim();
    address = String(form.get("address") ?? "").trim();
    issueDescription = String(form.get("issueDescription") ?? "").trim();
    urgencyRaw = form.get("urgency") ?? "this_week";
    slotId = String(form.get("slotId") ?? "").trim() || undefined;
    insuranceCarrier = String(form.get("insuranceCarrier") ?? "").trim();
    insuranceClaimNumber = String(form.get("insuranceClaimNumber") ?? "").trim();
    waterSource = String(form.get("waterSource") ?? "").trim();
    activeLoss = form.get("activeLoss") === "1" || form.get("activeLoss") === "true";
    smsConsent = parseCustomerSmsConsent(form.get("smsConsent"));
    smsMarketingConsent = parseCustomerMarketingSmsConsent(form.get("smsMarketingConsent"));
    const photo = form.get("photo");
    if (photo && photo instanceof File && photo.size > 0) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const mime = photo.type || "image/jpeg";
      const saved = await saveIntakePhoto(token, buffer, mime);
      if (!saved.ok) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      photoRef = saved.ref;
    }
  } else {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    customerName = String(body.customerName ?? "").trim();
    address = String(body.address ?? "").trim();
    issueDescription = String(body.issueDescription ?? "").trim();
    urgencyRaw = body.urgency;
    slotId = String(body.slotId ?? "").trim() || undefined;
    insuranceCarrier = String(body.insuranceCarrier ?? "").trim();
    insuranceClaimNumber = String(body.insuranceClaimNumber ?? "").trim();
    waterSource = String(body.waterSource ?? "").trim();
    activeLoss = body.activeLoss === true || body.activeLoss === "1";
    smsConsent = parseCustomerSmsConsent(body.smsConsent);
    smsMarketingConsent = parseCustomerMarketingSmsConsent(body.smsMarketingConsent);
  }

  const customerSmsConsent = buildCustomerSmsConsentRecord({
    serviceConsent: smsConsent,
    marketingConsent: smsMarketingConsent,
  });
  if (!customerSmsConsent) {
    return NextResponse.json(
      { error: "SMS consent is required to submit this form." },
      { status: 400 },
    );
  }

  const urgency = parseLinkUrgency(urgencyRaw) ?? "this_week";

  if (!customerName || !address || issueDescription.length < 4) {
    return NextResponse.json(
      { error: apiErrorsEn.intakeFieldsRequired },
      { status: 400 },
    );
  }

  const result = await withDistributedLock(`link-intake-submit:${token}`, () =>
    submitLinkIntakeForm({
      token,
      customerName,
      address,
      issueDescription,
      urgency,
      photoRef,
      slotId,
      insuranceCarrier: insuranceCarrier || undefined,
      insuranceClaimNumber: insuranceClaimNumber || undefined,
      waterSource: waterSource || undefined,
      activeLoss,
      customerSmsConsent,
    }),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    bookingId: result.bookingId,
    requestNumber: result.requestNumber,
    booking: result.booking,
  });
}
