import { NextResponse } from "next/server";
import { getRetellAgentId, getRetellLlmId, retellToolUrls } from "@/lib/retell-config";

const PRODUCTION_PROMPT =
  "You are a warm, upbeat phone intake specialist for a US water, fire, and mold restoration company. " +
  "Speak naturally and reassuringly — never robotic. " +
  "FIRST figure out what the caller wants: active damage/emergency (PATH A) or free estimate only (PATH B). " +
  "PATH A: get name, exact address, damage type (water/fire/mold/sewage). Confirm, then call submit_intake once. " +
  "PATH B: get name, address, damage type, when noticed, preferred callback time. Never quote a price. Confirm, then call submit_estimate once. " +
  "If audio is unclear, ask them to repeat — never guess addresses or names. Give callers time to speak.";

const PRODUCTION_BEGIN =
  "Thanks so much for calling — I'm here to help. Could you tell me your name, and what's going on today?";

function cronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (isDeployed && !secret) return false;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = request.headers.get("x-cron-secret");
  return bearer === secret || header === secret;
}

/**
 * Sync Retell agent to English production prompt + wire Effiroad tool URLs.
 * GET /api/cron/retell-production-sync (CRON_SECRET)
 */
export async function GET(request: Request) {
  if (!cronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "RETELL_API_KEY not configured" }, { status: 503 });
  }

  const agentId = getRetellAgentId();
  const llmId = getRetellLlmId();
  const urls = retellToolUrls();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const generalTools = [
    {
      type: "custom",
      name: "submit_intake",
      description:
        "Call once after confirming booking/emergency details: customer name, property address, damage type, notes.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitIntake,
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string" },
          address: { type: "string" },
          issueType: { type: "string" },
          notes: { type: "string" },
        },
        required: ["customerName", "address", "issueType"],
      },
    },
    {
      type: "custom",
      name: "submit_estimate",
      description: "Call once after confirming free-estimate details. Never quote a price.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitEstimate,
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

  try {
    const llmRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        general_prompt: PRODUCTION_PROMPT,
        begin_message: PRODUCTION_BEGIN,
        general_tools: generalTools,
      }),
    });
    if (!llmRes.ok) {
      const body = await llmRes.text();
      return NextResponse.json(
        { error: "update-retell-llm failed", status: llmRes.status, body },
        { status: 502 },
      );
    }

    const agentRes = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        agent_name: "Effiroad English Intake Agent",
        language: "en-US",
        stt_mode: "accurate",
        interruption_sensitivity: 0.5,
        responsiveness: 0.9,
        reminder_trigger_ms: 12000,
        reminder_max_count: 1,
      }),
    });
    if (!agentRes.ok) {
      const body = await agentRes.text();
      return NextResponse.json(
        { error: "update-agent failed", status: agentRes.status, body },
        { status: 502 },
      );
    }

    const listRes = await fetch("https://api.retellai.com/v2/list-phone-numbers?limit=100", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    let phoneUpdated = false;
    if (listRes.ok) {
      const list = (await listRes.json()) as {
        items?: Array<{ phone_number: string; inbound_agents?: Array<{ agent_id?: string }> }>;
      };
      const phone =
        list.items?.find((n) =>
          (n.inbound_agents ?? []).some((a) => a.agent_id === agentId),
        ) ?? list.items?.[0];
      if (phone?.phone_number) {
        const patch = await fetch(
          `https://api.retellai.com/update-phone-number/${encodeURIComponent(phone.phone_number)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              inbound_agents: [{ agent_id: agentId, agent_version: "latest", weight: 1 }],
              inbound_webhook_url: urls.inbound,
            }),
          },
        );
        phoneUpdated = patch.ok;
      }
    }

    return NextResponse.json({
      ok: true,
      agentId,
      llmId,
      phoneWebhookUpdated: phoneUpdated,
      toolUrls: urls,
      mode: "english-production-sip",
    });
  } catch (e) {
    console.error("[cron/retell-production-sync]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 },
    );
  }
}
