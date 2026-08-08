import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSettings, saveSettings, sessionValid } from "@/lib/content-autopilot/store";

const COOKIE = "autopilot_session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!(await sessionValid(token))) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, string>;
  const patch: Record<string, string> = {};
  if (body.llmApiKey) patch.llmApiKey = body.llmApiKey;
  if (body.llmModel) patch.llmModel = body.llmModel;
  if (body.ntfyTopic) patch.ntfyTopic = body.ntfyTopic;
  if (body.webhookUrl) patch.webhookUrl = body.webhookUrl;
  const next = await saveSettings(patch);
  return NextResponse.json({
    ok: true,
    hasLlmKey: Boolean(next.llmApiKey || process.env.OPENAI_API_KEY),
    ntfyTopic: next.ntfyTopic,
  });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!(await sessionValid(token))) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }
  const s = await getSettings();
  return NextResponse.json({
    llmModel: s.llmModel || "gpt-4.1-mini",
    ntfyTopic: s.ntfyTopic || "",
    hasLlmKey: Boolean(s.llmApiKey || process.env.OPENAI_API_KEY),
  });
}
