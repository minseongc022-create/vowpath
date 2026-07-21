const DEFAULT_AGENT_ID = "agent_6e612965cf4b69f4312deee3f8";
const DEFAULT_LLM_ID = "llm_9e819a0687ea88f77b29f8de448d";

let cachedForwardNumber: string | null | undefined;

export function getRetellApiKey(): string | undefined {
  return process.env.RETELL_API_KEY?.trim() || undefined;
}

export function getRetellAgentId(): string {
  return process.env.RETELL_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
}

/** Separate Retell agent for estimate paths — warmer, brighter voice. */
export function getRetellEstimateAgentId(): string | undefined {
  return process.env.RETELL_ESTIMATE_AGENT_ID?.trim() || undefined;
}

export function resolveRetellAgentIdForIvrPath(ivrPath?: string): string {
  if (ivrPath === "estimate_choice" || ivrPath === "phone_estimate") {
    return getRetellEstimateAgentId() ?? getRetellAgentId();
  }
  return getRetellAgentId();
}

export function getRetellLlmId(): string {
  return process.env.RETELL_LLM_ID?.trim() || DEFAULT_LLM_ID;
}

export function isRetellConfigured(): boolean {
  return Boolean(getRetellApiKey());
}

/**
 * When true, inbound calls skip the Twilio DTMF menu and connect straight to Retell.
 * Default: menu first (press 1 = service, press 2 = estimate), then Retell on booking path.
 * Set RETELL_SKIP_DTMF_MENU=true to restore direct-to-Retell behavior.
 */
export function shouldRetellAnswerAllCalls(): boolean {
  if (!isRetellConfigured()) return false;
  const skip = process.env.RETELL_SKIP_DTMF_MENU?.trim().toLowerCase();
  if (skip === "true" || skip === "1" || skip === "yes") return true;
  return false;
}

export function getRetellForwardNumberEnv(): string | undefined {
  return process.env.RETELL_FORWARD_NUMBER?.trim() || undefined;
}

type RetellPhoneNumber = {
  phone_number: string;
  inbound_agents?: Array<{ agent_id?: string; weight?: number }>;
};

/** Resolve the PSTN number Twilio should <Dial> to reach the Retell agent. */
export async function resolveRetellForwardNumber(): Promise<string | null> {
  const fromEnv = getRetellForwardNumberEnv();
  if (fromEnv) return fromEnv;

  if (cachedForwardNumber !== undefined) return cachedForwardNumber;

  const apiKey = getRetellApiKey();
  if (!apiKey) {
    cachedForwardNumber = null;
    return null;
  }

  const agentId = getRetellAgentId();
  try {
    const res = await fetch("https://api.retellai.com/v2/list-phone-numbers?limit=100", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.warn("[retell-config] list-phone-numbers failed:", res.status);
      cachedForwardNumber = null;
      return null;
    }
    const data = (await res.json()) as { items?: RetellPhoneNumber[] };
    const items = data.items ?? [];
    const match = items.find((n) =>
      (n.inbound_agents ?? []).some((a) => a.agent_id === agentId),
    );
    cachedForwardNumber = match?.phone_number ?? items[0]?.phone_number ?? null;
    return cachedForwardNumber;
  } catch (e) {
    console.warn("[retell-config] resolveRetellForwardNumber error:", e);
    cachedForwardNumber = null;
    return null;
  }
}

export function getRetellWebhookBaseUrl(): string {
  const base =
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ||
    (process.env.VERCEL === "1" ? "https://effiroad.com" : "");
  return base;
}

export function retellToolUrls() {
  const base = getRetellWebhookBaseUrl();
  return {
    inbound: `${base}/api/retell/inbound`,
    submitIntake: `${base}/api/retell/tools/submit-intake`,
    submitEstimate: `${base}/api/retell/tools/submit-estimate`,
  };
}

export type RegisterRetellCallParams = {
  from: string;
  to: string;
  dynamicVariables?: Record<string, string>;
  /** Twilio menu path — selects estimate vs booking Retell agent voice. */
  ivrPath?: string;
};

export type RegisterRetellCallResult =
  | { ok: true; callId: string; sipUri: string }
  | { ok: false; error: string };

/** Official Twilio → Retell bridge: register call, then <Dial><Sip>…</Sip></Dial>. */
export async function registerRetellInboundCall(
  params: RegisterRetellCallParams,
): Promise<RegisterRetellCallResult> {
  const apiKey = getRetellApiKey();
  if (!apiKey) return { ok: false, error: "RETELL_API_KEY not configured" };

  const from = params.from.replace(/^whatsapp:/, "").trim();
  const to = params.to.trim();
  const ivrPath = params.ivrPath ?? params.dynamicVariables?.ivr_path ?? "";
  const body: Record<string, unknown> = {
    agent_id: resolveRetellAgentIdForIvrPath(ivrPath),
    agent_version: "latest",
    direction: "inbound",
  };
  if (from && from !== "unknown") body.from_number = from;
  if (to && to !== "unknown") body.to_number = to;
  if (params.dynamicVariables && Object.keys(params.dynamicVariables).length > 0) {
    body.retell_llm_dynamic_variables = params.dynamicVariables;
  }

  try {
    const res = await fetch("https://api.retellai.com/v2/register-phone-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[retell-config] register-phone-call failed:", res.status, text);
      return { ok: false, error: `register-phone-call ${res.status}` };
    }
    const data = JSON.parse(text) as { call_id?: string };
    const callId = data.call_id?.trim();
    if (!callId) {
      return { ok: false, error: "register-phone-call missing call_id" };
    }
    return {
      ok: true,
      callId,
      sipUri: `sip:${callId}@sip.retellai.com`,
    };
  } catch (e) {
    console.error("[retell-config] register-phone-call error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "register failed" };
  }
}

export function retellSipUri(callId: string): string {
  return `sip:${callId}@sip.retellai.com`;
}
