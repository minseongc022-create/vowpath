import { NextResponse } from "next/server";
import { isTenantAfterHours } from "@/lib/after-hours";
import { DEFAULT_SHOP_DISPLAY_NAME, shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { recordInboundEvent } from "@/lib/inbound-events";
import { getCompanyAiMemory } from "@/lib/company-ai-memory";
import { getShopVertical } from "@/lib/vertical-context";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { findRecentCallLogByPhone } from "@/lib/call-logs";
import {
  buildRetellIntakeGuide,
  buildReturningCustomerHint,
} from "@/lib/retell-intake-guide";
import { buildRetellOpeningLine } from "@/lib/retell-opening-line";

/**
 * Retell's "Inbound Call Webhook" for an imported phone number — called
 * synchronously before the call connects to any agent. We resolve the tenant
 * from the dialed number and hand back dynamic variables (shop name, vertical,
 * closure/after-hours state) for the agent's prompt to use, mirroring the
 * closure/after-hours checks in app/api/twilio/voice/route.ts.
 *
 * Response shape follows Retell's documented "call_inbound" webhook contract:
 * https://docs.retellai.com (Inbound Call Webhook) — verify against a live
 * test call and adjust field names here if Retell's dashboard test shows a
 * mismatch.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateRetellWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inbound = (body.call_inbound ?? body) as Record<string, unknown>;
  const to = String(inbound.to_number ?? inbound.to ?? "");
  const from = String(inbound.from_number ?? inbound.from ?? "");

  if (!to) {
    return NextResponse.json({ error: "Missing to_number" }, { status: 400 });
  }

  const userId = await resolveTenantUserId({ to, from });
  if (!userId) {
    return NextResponse.json({
      call_inbound: {
        dynamic_variables: {
          shop_name: DEFAULT_SHOP_DISPLAY_NAME,
          closed_message:
            "This line is not fully set up yet. Please call back later or contact your office during business hours.",
        },
      },
    });
  }

  // Payment gate: unpaid/expired tenant → the agent greets with a "not active"
  // closed message and collects nothing.
  if (!(await isRetellTenantEntitled(userId, { to, from }))) {
    const shopName = await shopDisplayNameForUser(userId).catch(() => DEFAULT_SHOP_DISPLAY_NAME);
    return NextResponse.json({
      call_inbound: {
        dynamic_variables: {
          shop_name: shopName,
          closed_message:
            "Thank you for calling. This answering service is not active right now. Please contact the business directly.",
        },
      },
    });
  }

  try {
    const [shopName, vertical, memory, afterHours, pastMatch] = await Promise.all([
      shopDisplayNameForUser(userId),
      getShopVertical(userId),
      getCompanyAiMemory(userId),
      isTenantAfterHours(userId),
      findRecentCallLogByPhone(userId, from),
    ]);

    const todayUtc = new Date().toISOString().split("T")[0];
    const isClosedToday = memory?.temporaryClosureDate === todayUtc;
    const closedMessage = isClosedToday
      ? memory?.temporaryClosureMessage ||
        `Thank you for calling ${shopName}. We are closed today. Please call back tomorrow or leave a text message and we'll get back to you.`
      : "";

    void recordInboundEvent(userId, {
      callSid: "",
      from,
      to,
      status: "voice_started",
      direction: "inbound",
    }).catch((e) => console.warn("[retell/inbound] record event failed:", e));

    return NextResponse.json({
      call_inbound: {
        dynamic_variables: {
          shop_name: shopName,
          vertical,
          after_hours: afterHours ? "true" : "false",
          closed_message: closedMessage,
          custom_greeting: memory?.customGreeting ?? "",
          ivr_path: "",
          opening_line: buildRetellOpeningLine(""),
          intake_guide: buildRetellIntakeGuide(vertical),
          returning_customer: buildReturningCustomerHint(
            pastMatch
              ? {
                  customerName: pastMatch.customerName ?? "",
                  address: pastMatch.address ?? "",
                }
              : null,
          ),
        },
      },
    });
  } catch (e) {
    console.error("[retell/inbound] tenant lookup failed:", e);
    return NextResponse.json({
      call_inbound: {
        dynamic_variables: {
          shop_name: DEFAULT_SHOP_DISPLAY_NAME,
          closed_message: "",
        },
      },
    });
  }
}
