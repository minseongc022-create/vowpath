import { NextResponse } from "next/server";
import { apiErrorsEn } from "@/lib/api-errors-en";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { submitLinkIntakeForm } from "@/lib/call-intake/link-intake-flow";
import {
  canSubmitLinkIntakeForm,
  getLinkIntakeSession,
  isLinkIntakePortalOpen,
  isLinkIntakeSessionExpired,
} from "@/lib/call-intake/link-intake-store";
import { saveIntakePhoto } from "@/lib/intake-photo-store";
import { parseLinkUrgency } from "@/lib/link-intake-urgency";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const guard = await guardPublicIntakeRoute(request, token);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const session = await getLinkIntakeSession(token);
  if (!session || isLinkIntakeSessionExpired(session)) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
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
  const contentType = request.headers.get("content-type") ?? "";

  let customerName = "";
  let address = "";
  let issueDescription = "";
  let urgencyRaw: unknown = "this_week";
  let photoRef: string | undefined;
  let slotId: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    customerName = String(form.get("customerName") ?? "").trim();
    address = String(form.get("address") ?? "").trim();
    issueDescription = String(form.get("issueDescription") ?? "").trim();
    urgencyRaw = form.get("urgency") ?? "this_week";
    slotId = String(form.get("slotId") ?? "").trim() || undefined;
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
  }

  const urgency = parseLinkUrgency(urgencyRaw) ?? "this_week";

  if (!customerName || !address || issueDescription.length < 4) {
    return NextResponse.json(
      { error: apiErrorsEn.intakeFieldsRequired },
      { status: 400 },
    );
  }

  const result = await submitLinkIntakeForm({
    token,
    customerName,
    address,
    issueDescription,
    urgency,
    photoRef,
    slotId,
  });

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
