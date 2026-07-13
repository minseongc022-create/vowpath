const DEFAULT_AGENT_ID = "agent_6e612965cf4b69f4312deee3f8";
const DEFAULT_LLM_ID = "llm_9e819a0687ea88f77b29f8de448d";

let cachedForwardNumber: string | null | undefined;

export function getRetellApiKey(): string | undefined {
  return process.env.RETELL_API_KEY?.trim() || undefined;
}

export function getRetellAgentId(): string {
  return process.env.RETELL_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
}

export function getRetellLlmId(): string {
  return process.env.RETELL_LLM_ID?.trim() || DEFAULT_LLM_ID;
}

export function isRetellConfigured(): boolean {
  return Boolean(getRetellApiKey());
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
