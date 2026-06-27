import { NextResponse } from "next/server";
import { resolveCallbackFromCallerId } from "@/lib/call-intake/caller-id";
import { extractIntakeFromSpeech } from "@/lib/call-intake/extraction";
import { generateAiSummary } from "@/lib/call-intake/ai-summary";
import { finalizeVerifiedIntake } from "@/lib/call-intake/finalize-intake";
import { validateServiceAddress } from "@/lib/call-intake/address-validation";
import type { VerifiedCallPayload } from "@/lib/call-intake/types";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { offerVisitSlotsForTenant } from "@/lib/scheduling/offer-slots";
import type { SlotOffer } from "@/lib/booking-settings";
import { getSession } from "@/lib/session";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";
import { findUserById } from "@/lib/users-db";
import { normalizeCustomerSmsPhone } from "@/lib/sms-region-config";
import type { JobPriority } from "@/lib/types";

const DEV_CALLBACK_FALLBACK = "+15125550100";

function resolveDevCallbackPhone(
  override: string | undefined,
  accountPhone: string | undefined,
): string {
  if (override?.trim()) {
    const n = normalizeCustomerSmsPhone(override.trim());
    if (n) return n;
  }
  if (accountPhone?.trim()) {
    const n = normalizeCustomerSmsPhone(accountPhone.trim());
    if (n) return n;
  }
  return DEV_CALLBACK_FALLBACK;
}

const SAMPLE_SPEECH =
  "Hi, Sarah Johnson, one two three Main Street, Austin Texas, no cool, indoor eighty-six degrees, two kids at home, need someone tonight.";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 환경에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let speech = SAMPLE_SPEECH;
  let callbackOverride: string | undefined;
  let menuPriority: JobPriority | null = null;
  let slotIndex = 1;
  let skipSlotPick = false;
  try {
    const body = await request.json();
    if (typeof body?.speech === "string" && body.speech.trim().length >= 8) {
      speech = body.speech.trim();
    }
    if (typeof body?.callbackPhone === "string" && body.callbackPhone.trim()) {
      callbackOverride = body.callbackPhone.trim();
    }
    if (body?.menuPriority === "P1" || body?.menuPriority === "P2" || body?.menuPriority === "P3") {
      menuPriority = body.menuPriority;
    }
    if (typeof body?.slotIndex === "number" && body.slotIndex >= 1 && body.slotIndex <= 5) {
      slotIndex = Math.round(body.slotIndex);
    }
    if (body?.skipSlotPick === true) {
      skipSlotPick = true;
    }
  } catch {
    /* use sample */
  }

  const userId = session.sub;
  const accountPhone = (await findUserById(userId))?.phone?.trim();
  const from = resolveDevCallbackPhone(callbackOverride, accountPhone);
  const to =
    (await getTenantTwilioPhone(userId)) ??
    process.env.TWILIO_PHONE_NUMBER?.trim() ??
    "+12255291680";

  try {
    const { draft, confidence } = await extractIntakeFromSpeech(speech, menuPriority);
    const addressCheck = await validateServiceAddress(draft.address);
    if (addressCheck.valid && addressCheck.formattedAddress) {
      draft.address = addressCheck.formattedAddress;
      if (draft.serviceLocation === "Unknown" || draft.serviceLocation === draft.address) {
        draft.serviceLocation = addressCheck.formattedAddress;
      }
    }

    const callbackPhone = resolveCallbackFromCallerId(from);
    const payload: VerifiedCallPayload = {
      transcript: speech,
      customerName: draft.customerName,
      address: draft.address,
      serviceLocation: draft.serviceLocation,
      issueType: draft.issueType,
      symptom: draft.symptom,
      priority: draft.priority,
      servicePriority: draft.servicePriority,
      priorityReasons: draft.priorityReasons,
      prioritySource: draft.prioritySource,
      arrivalWindow: draft.arrivalWindow,
      dispatchNotes: draft.dispatchNotes,
      jobberPasteBlock: draft.jobberPasteBlock,
      callbackPhone,
      aiSummary: generateAiSummary(draft, draft.priority),
      callSid: `dev-${Date.now()}`,
      to,
      confidence,
      verificationComplete: true,
      addressValidation: {
        valid: addressCheck.valid,
        formattedAddress: addressCheck.formattedAddress,
        provider: addressCheck.provider,
      },
      verifiedFields: {
        customerName: true,
        address: addressCheck.valid,
        serviceLocation: true,
        issueType: true,
      },
      lossCategory: draft.lossCategory,
    };

    const settings = await getShopBookingSettings(userId);
    let offeredSlots: SlotOffer[] = [];
    let selectedSlot: SlotOffer | null = null;

    if (settings.schedulingEnabled && !skipSlotPick) {
      offeredSlots = await offerVisitSlotsForTenant({
        userId,
        priority: draft.priority,
      });
      if (offeredSlots.length > 0) {
        const idx = Math.min(offeredSlots.length, slotIndex) - 1;
        selectedSlot = offeredSlots[idx] ?? null;
        draft.arrivalWindow = selectedSlot.label;
        payload.arrivalWindow = selectedSlot.label;
      }
    }

    const result = await finalizeVerifiedIntake(userId, payload, {
      intakeChannel: "phone",
      selectedSlot,
    });

    const bookingId = `call-${result.callLogId}`;
    return NextResponse.json({
      ok: true,
      ...result,
      bookingId,
      priority: draft.priority,
      priorityReasons: draft.priorityReasons,
      schedulingMode: settings.schedulingMode,
      offeredSlots: offeredSlots.map((s) => ({ id: s.id, label: s.label })),
      selectedSlot: selectedSlot
        ? { id: selectedSlot.id, label: selectedSlot.label }
        : null,
      message:
        selectedSlot
          ? `Dev simulation: customer picked slot ${slotIndex} (${selectedSlot.label}).`
          : offeredSlots.length === 0
            ? "Dev simulation: no slots available — no_slot path."
            : "Dev simulation: fields auto-verified without slot pick.",
    });
  } catch (e) {
    console.error("[simulate-call]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "시뮬레이션 실패" },
      { status: 500 },
    );
  }
}
