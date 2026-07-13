import { NextResponse } from "next/server";
import {
  getRetellAgentId,
  getRetellForwardNumberEnv,
  isRetellConfigured,
  resolveRetellForwardNumber,
  retellToolUrls,
  shouldRetellAnswerAllCalls,
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
      answerAllCalls: shouldRetellAnswerAllCalls(),
      dtmfMenuDisabled: shouldRetellAnswerAllCalls(),
      pstnFallbackNumber: forwardNumber,
      agentId: getRetellAgentId(),
      toolUrls: retellToolUrls(),
    },
    howToTest:
      "Call +1 (225) 529-1680 — Retell AI answers immediately (no press 1/2/3). Handles booking, estimates, and Spanish in conversation.",
    syncAgent: "GET /api/cron/retell-production-sync with CRON_SECRET",
  });
}
