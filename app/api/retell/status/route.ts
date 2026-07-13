import { NextResponse } from "next/server";
import {
  getRetellAgentId,
  getRetellForwardNumberEnv,
  isRetellConfigured,
  resolveRetellForwardNumber,
  retellToolUrls,
} from "@/lib/retell-config";

export const dynamic = "force-dynamic";

/** Public Retell readiness check (no secrets exposed). */
export async function GET() {
  const apiKeyConfigured = isRetellConfigured();
  const forwardFromEnv = Boolean(getRetellForwardNumberEnv());
  const forwardNumber = apiKeyConfigured ? await resolveRetellForwardNumber() : null;

  return NextResponse.json({
    ok: apiKeyConfigured,
    retell: {
      apiKeyConfigured,
      forwardFromEnv: forwardFromEnv,
      forwardNumberConfigured: Boolean(forwardNumber),
      bridgeMode: apiKeyConfigured ? "sip-register-phone-call" : "none",
      pstnFallbackNumber: forwardNumber,
      agentId: getRetellAgentId(),
      toolUrls: retellToolUrls(),
    },
    howToTest:
      "Call +1 (225) 529-1680 → press 1 → press 1. You should hear the Retell conversational agent (not Google TTS scripted intake).",
    syncAgent: "GET /api/cron/retell-production-sync with CRON_SECRET",
  });
}
