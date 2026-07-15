import {
  RETELL_PRODUCTION_BEGIN_MESSAGE,
  RETELL_PRODUCTION_PROMPT,
  buildRetellGeneralTools,
} from "./retell-agent-config.mjs";
import {
  RETELL_PROMPT_VERSION,
  buildRetellProductionAgentPatch,
  pickNaturalReceptionistVoice,
} from "./retell-agent-settings.mjs";

/**
 * Push prompt, tools, and agent settings to Retell. Idempotent.
 * @returns {{ ok: true, phone: string } | { ok: false, error: string }}
 */
export async function runRetellSync(env = process.env) {
  const apiKey = env.RETELL_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RETELL_API_KEY not set" };
  }

  const agentId = env.RETELL_AGENT_ID?.trim() || "agent_6e612965cf4b69f4312deee3f8";
  const llmId = env.RETELL_LLM_ID?.trim() || "llm_9e819a0687ea88f77b29f8de448d";
  const userId = env.TWILIO_DEFAULT_USER_ID?.trim();
  const base =
    env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "") ||
    env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ||
    "https://effiroad.com";

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  async function retell(path, init = {}) {
    const res = await fetch(`https://api.retellai.com${path}`, { ...init, headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  const { generalTools, urls } = buildRetellGeneralTools(base);

  const currentAgent = await retell(`/get-agent/${agentId}`);
  const voices = await retell("/list-voices");
  const voiceId = pickNaturalReceptionistVoice(voices, {
    explicitId: env.RETELL_VOICE_ID,
    currentVoiceId: currentAgent.voice_id,
  });

  await retell(`/update-retell-llm/${llmId}`, {
    method: "PATCH",
    body: JSON.stringify({
      general_prompt: RETELL_PRODUCTION_PROMPT,
      begin_message: RETELL_PRODUCTION_BEGIN_MESSAGE,
      general_tools: generalTools,
    }),
  });

  await retell(`/update-agent/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(buildRetellProductionAgentPatch(voiceId)),
  });

  console.log("[retell:sync] voice_id →", voiceId);

  const list = await retell("/v2/list-phone-numbers?limit=100");
  const items = list.items ?? [];
  let phone = items.find((n) =>
    (n.inbound_agents ?? []).some((a) => a.agent_id === agentId),
  );
  if (!phone && items.length > 0) phone = items[0];
  if (!phone?.phone_number) {
    return { ok: false, error: "No Retell phone number in account" };
  }

  const e164 = phone.phone_number;
  await retell(`/update-phone-number/${encodeURIComponent(e164)}`, {
    method: "PATCH",
    body: JSON.stringify({
      inbound_agents: [{ agent_id: agentId, agent_version: "latest", weight: 1 }],
      inbound_webhook_url: urls.inbound,
      nickname: "Effiroad inbound",
    }),
  });

  if (userId) {
    const kvUrl = env.KV_REST_API_URL?.trim() || env.UPSTASH_REDIS_REST_URL?.trim();
    const kvToken = env.KV_REST_API_TOKEN?.trim() || env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (kvUrl && kvToken) {
      await fetch(kvUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${kvToken}` },
        body: JSON.stringify(["SET", `effiroad:twilio-phone:${e164}`, userId]),
      });
    }
  }

  return { ok: true, phone: e164, agentId, llmId, base, urls, voiceId, promptVersion: RETELL_PROMPT_VERSION };
}
