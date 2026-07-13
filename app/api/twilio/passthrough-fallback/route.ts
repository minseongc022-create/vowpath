import { NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { buildRetellBridgeTwiml } from "@/lib/retell-bridge";
import { shouldRetellAnswerAllCalls } from "@/lib/retell-config";
import { DEFAULT_SHOP_DISPLAY_NAME, shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { getCompanyAiMemory } from "@/lib/company-ai-memory";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { twimlGatherMainMenu, twimlResponse, twimlSay } from "@/lib/twilio-xml";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/**
 * Runs after an "Effiroad-number-as-main" live pass-through <Dial> completes.
 * If the shop's phone actually answered, hang up. Otherwise Retell AI catches the call.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/passthrough-fallback] invalid signature — serving AI anyway");
  }

  const url = new URL(request.url);
  const form = new URLSearchParams(rawBody);
  const dialStatus = (form.get("DialCallStatus") ?? "").toLowerCase();
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const to = form.get("To") ?? "";
  const from = form.get("From") ?? "unknown";

  if (dialStatus === "completed" || dialStatus === "answered") {
    return twimlXml(twimlResponse(""));
  }

  if (shouldRetellAnswerAllCalls()) {
    return twimlXml(
      await buildRetellBridgeTwiml({
        afterHours: true,
        to,
        from,
        callSid,
        includeInboundRecording: true,
      }),
    );
  }

  let shopName = DEFAULT_SHOP_DISPLAY_NAME;
  let stormMode = false;
  let customGreeting = "";
  const userId = await resolveTenantUserId({ to, from, callSid });
  if (userId) {
    try {
      shopName = await shopDisplayNameForUser(userId);
      const memory = await getCompanyAiMemory(userId);
      customGreeting = memory?.customGreeting ?? "";
      const settings = await getShopBookingSettings(userId);
      stormMode = settings.stormModeEnabled;
    } catch (e) {
      console.error("[twilio/passthrough-fallback] tenant lookup failed:", e);
    }
  }

  const mainMenuUrl = buildTwilioCallbackUrl("/api/twilio/main-menu", {
    callSid,
    afterHours: "1",
  });
  return twimlXml(
    twimlResponse(
      twimlSay("Sorry we missed you — let me help you right now.") +
        twimlGatherMainMenu(mainMenuUrl, shopName, stormMode, customGreeting),
    ),
  );
}
