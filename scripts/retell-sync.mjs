/**
 * One-shot Retell production sync for Effiroad.
 * - Lists Retell phone numbers bound to the agent
 * - Sets inbound webhook + binds agent
 * - Updates LLM custom tools (submit_intake, submit_estimate)
 * - Prints RETELL_FORWARD_NUMBER for Vercel
 *
 * Usage: node scripts/retell-sync.mjs
 * Requires in .env.local: RETELL_API_KEY, TWILIO_WEBHOOK_BASE_URL (or NEXT_PUBLIC_APP_URL)
 * Optional: RETELL_AGENT_ID, RETELL_LLM_ID, TWILIO_DEFAULT_USER_ID (bind Retell number → tenant)
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const apiKey = process.env.RETELL_API_KEY?.trim();
const agentId = process.env.RETELL_AGENT_ID?.trim() || "agent_6e612965cf4b69f4312deee3f8";
const llmId = process.env.RETELL_LLM_ID?.trim() || "llm_9e819a0687ea88f77b29f8de448d";
const userId = process.env.TWILIO_DEFAULT_USER_ID?.trim();
const base =
  process.env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ||
  "https://effiroad.com";

if (!apiKey) {
  console.error("MISSING: RETELL_API_KEY in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

async function retell(path, init = {}) {
  const res = await fetch(`https://api.retellai.com${path}`, { ...init, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return json;
}

const toolUrls = {
  inbound: `${base}/api/retell/inbound`,
  submitIntake: `${base}/api/retell/tools/submit-intake`,
  submitEstimate: `${base}/api/retell/tools/submit-estimate`,
};

const generalTools = [
  {
    type: "custom",
    name: "submit_intake",
    description:
      "Call once after confirming booking/emergency details: customer name, property address, damage type (water/fire/mold/sewage), and any notes.",
    speak_after_execution: true,
    speak_during_execution: false,
    url: toolUrls.submitIntake,
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Caller's name" },
        address: { type: "string", description: "Full property address" },
        issueType: { type: "string", description: "water, fire, mold, or sewage backup" },
        notes: { type: "string", description: "Anything else the caller mentioned" },
      },
      required: ["customerName", "address", "issueType"],
    },
  },
  {
    type: "custom",
    name: "submit_estimate",
    description:
      "Call once after confirming free-estimate details. Never quote a price. Collect name, address, damage type, when noticed, preferred callback time.",
    speak_after_execution: true,
    speak_during_execution: false,
    url: toolUrls.submitEstimate,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        address: { type: "string" },
        damageType: { type: "string" },
        noticedWhen: { type: "string" },
        preferredTime: { type: "string" },
        callbackPhone: { type: "string" },
      },
      required: ["name", "address", "damageType"],
    },
  },
];

console.log("--- Retell sync ---");
console.log("Base URL:", base);
console.log("Agent:", agentId);
console.log("LLM:", llmId);

const list = await retell("/v2/list-phone-numbers?limit=100");
const items = list.items ?? [];
let phone = items.find((n) =>
  (n.inbound_agents ?? []).some((a) => a.agent_id === agentId),
);

if (!phone && items.length > 0) {
  phone = items[0];
  console.log("WARN: no phone bound to agent — using first Retell number:", phone.phone_number);
}

if (!phone) {
  console.error("NO_RETELL_PHONE: buy or import a number in Retell dashboard first.");
  process.exit(1);
}

const e164 = phone.phone_number;
console.log("Retell phone:", e164, phone.phone_number_pretty ?? "");

await retell(`/update-phone-number/${encodeURIComponent(e164)}`, {
  method: "PATCH",
  body: JSON.stringify({
    inbound_agents: [{ agent_id: agentId, agent_version: "latest", weight: 1 }],
    inbound_webhook_url: toolUrls.inbound,
    nickname: "Effiroad inbound",
  }),
});
console.log("OK phone webhook + agent binding");

await retell(`/update-retell-llm/${llmId}`, {
  method: "PATCH",
  body: JSON.stringify({ general_tools: generalTools }),
});
console.log("OK LLM tools →", toolUrls.submitIntake);

if (userId) {
  const kvUrl =
    process.env.KV_REST_API_URL?.trim() || process.env.UPSTASH_REDIS_REST_URL?.trim();
  const kvToken =
    process.env.KV_REST_API_TOKEN?.trim() || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (kvUrl && kvToken) {
    const key = `effiroad:twilio-phone:${e164}`;
    await fetch(kvUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
      body: JSON.stringify(["SET", key, userId]),
    });
    console.log("OK KV bind", e164, "→", userId);
  } else {
    console.log("SKIP KV bind (no KV_REST_API_* in env)");
  }
}

console.log("\n=== Add to Vercel Production env ===");
console.log(`RETELL_API_KEY=${apiKey.slice(0, 8)}...`);
console.log(`RETELL_FORWARD_NUMBER=${e164}`);
console.log(`RETELL_AGENT_ID=${agentId}`);
console.log(`RETELL_LLM_ID=${llmId}`);
console.log("\nTest: call +1 (225) 529-1680 → 1 → 1");
