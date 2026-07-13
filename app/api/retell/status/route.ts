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
  const urls = retellToolUrls();

  return NextResponse.json({
    ok: apiKeyConfigured && Boolean(forwardNumber),
    retell: {
      apiKeyConfigured,
      forwardFromEnv,
      forwardNumberConfigured: Boolean(forwardNumber),
      agentId: getRetellAgentId(),
      toolUrls: urls,
    },
    howToTest:
      "Call +1 (225) 529-1680 → press 1 (book) → press 1 (talk to AI). Retell handles that path when forward number resolves.",
  });
}
