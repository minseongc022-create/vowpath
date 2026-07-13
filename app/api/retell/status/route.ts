import { NextResponse } from "next/server";
import {
  getRetellAgentId,
  getRetellApiKey,
  getRetellForwardNumberEnv,
  getRetellLlmId,
  isRetellConfigured,
  resolveRetellForwardNumber,
  retellToolUrls,
  shouldRetellAnswerAllCalls,
} from "@/lib/retell-config";
import { RETELL_PROMPT_VERSION, RETELL_PROMPT_SYNC_MARKER, buildRetellProductionAgentPatch } from "@/lib/retell-agent-settings";
import { RETELL_PRODUCTION_BEGIN_MESSAGE } from "@/lib/retell-prompt";
import { mainMenuIsEnglishOnly } from "@/lib/twilio-xml";

export const dynamic = "force-dynamic";

type LiveAgentSnapshot = {
  voiceId?: string;
  voiceSpeed?: number;
  responsiveness?: number;
  backchannelEnabled?: boolean;
  beginMessage?: string;
  promptSynced?: boolean;
  promptEnglishStrict?: boolean;
  toneSynced?: boolean;
};

async function fetchLiveAgentSnapshot(): Promise<LiveAgentSnapshot | null> {
  const apiKey = getRetellApiKey();
  if (!apiKey) return null;

  const agentId = getRetellAgentId();
  const llmId = getRetellLlmId();
  const headers = { Authorization: `Bearer ${apiKey}` };

  const [agentRes, llmRes] = await Promise.all([
    fetch(`https://api.retellai.com/get-agent/${agentId}`, { headers }),
    fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, { headers }),
  ]);

  if (!agentRes.ok) return null;

  const agent = (await agentRes.json()) as {
    voice_id?: string;
    voice_speed?: number;
    responsiveness?: number;
    interruption_sensitivity?: number;
    volume?: number;
    denoising_mode?: string;
    enable_backchannel?: boolean;
  };
  const llm = llmRes.ok
    ? ((await llmRes.json()) as { begin_message?: string; general_prompt?: string })
    : null;

  const expected = buildRetellProductionAgentPatch();
  const beginMessage = llm?.begin_message?.trim();
  const expectedBegin = RETELL_PRODUCTION_BEGIN_MESSAGE.trim();
  const generalPrompt = llm?.general_prompt ?? "";

  return {
    voiceId: agent.voice_id,
    voiceSpeed: agent.voice_speed,
    responsiveness: agent.responsiveness,
    backchannelEnabled: agent.enable_backchannel,
    beginMessage: beginMessage?.slice(0, 80),
    promptSynced:
      beginMessage === expectedBegin &&
      generalPrompt.includes(RETELL_PROMPT_SYNC_MARKER),
    promptEnglishStrict: generalPrompt.includes(RETELL_PROMPT_SYNC_MARKER),
    toneSynced:
      agent.enable_backchannel === expected.enable_backchannel &&
      agent.responsiveness === expected.responsiveness &&
      agent.voice_speed === expected.voice_speed &&
      agent.interruption_sensitivity === expected.interruption_sensitivity &&
      agent.volume === expected.volume &&
      agent.denoising_mode === expected.denoising_mode,
  };
}

/** Public Retell readiness check (no secrets exposed). */
export async function GET() {
  const apiKeyConfigured = isRetellConfigured();
  const forwardFromEnv = Boolean(getRetellForwardNumberEnv());
  const forwardNumber = apiKeyConfigured ? await resolveRetellForwardNumber() : null;
  const liveAgent = apiKeyConfigured ? await fetchLiveAgentSnapshot() : null;

  return NextResponse.json({
    ok: apiKeyConfigured,
    promptVersion: RETELL_PROMPT_VERSION,
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
      liveAgent,
      needsSync: liveAgent
        ? !liveAgent.promptSynced || !liveAgent.toneSynced || !liveAgent.promptEnglishStrict
        : null,
    },
    twilio: {
      mainMenuEnglishOnly: mainMenuIsEnglishOnly(),
    },
    howToTest:
      "Call your shop line → main menu → press 1 (service) → press 1 (phone) → dispatcher collects details.",
    syncAgent: "GET /api/cron/retell-production-sync with CRON_SECRET",
  });
}
