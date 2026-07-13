import { NextResponse } from "next/server";
import { getRetellAgentId, getRetellLlmId, getRetellWebhookBaseUrl, retellToolUrls, shouldRetellAnswerAllCalls } from "@/lib/retell-config";
import { RETELL_PRODUCTION_BEGIN_MESSAGE, RETELL_PRODUCTION_PROMPT } from "@/lib/retell-prompt";
import { buildRetellGeneralTools } from "@/lib/retell-tools";

const PRODUCTION_PROMPT = RETELL_PRODUCTION_PROMPT;
const PRODUCTION_BEGIN = RETELL_PRODUCTION_BEGIN_MESSAGE;

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
  const { generalTools } = buildRetellGeneralTools(getRetellWebhookBaseUrl());
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

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
      mode: "english-production-sip-all-calls",
      answerAllCalls: shouldRetellAnswerAllCalls(),
    });
  } catch (e) {
    console.error("[cron/retell-production-sync]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 },
    );
  }
}
