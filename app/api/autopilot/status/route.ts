import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getConnections,
  getInbox,
  getJob,
  getSettings,
  sessionValid,
} from "@/lib/content-autopilot/store";

const COOKIE = "autopilot_session";

function mask(v?: string) {
  if (!v) return "";
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!(await sessionValid(token))) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const [connections, inbox, job, settings] = await Promise.all([
    getConnections(),
    getInbox(),
    getJob(),
    getSettings(),
  ]);

  const hasLlm =
    Boolean(settings.llmApiKey) ||
    Boolean(process.env.OPENAI_API_KEY) ||
    Boolean(process.env.LLM_API_KEY);

  return NextResponse.json({
    connections,
    inbox,
    job,
    publicUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/autopilot`
      : null,
    permanentPath: "/autopilot",
    env: {
      hasLlmKey: hasLlm,
      llmKeyMask: mask(settings.llmApiKey || process.env.OPENAI_API_KEY),
      llmModel: settings.llmModel || process.env.LLM_MODEL || "gpt-4.1-mini",
      ntfyTopic: settings.ntfyTopic || process.env.NTFY_TOPIC || "",
    },
    tests: {
      wordpress: {
        ok: Boolean(connections.wordpress?.baseUrl && connections.wordpress?.appPassword),
        detail: connections.wordpress?.baseUrl ? "저장됨" : "미연결",
      },
      blogger: {
        ok: Boolean(connections.blogger?.blogId && connections.blogger?.accessToken),
        detail: connections.blogger?.blogId ? "저장됨" : "미연결",
      },
      naver: {
        ok: Boolean(connections.naver?.blogId),
        detail: connections.naver?.blogId ? `blog.naver.com/${connections.naver.blogId}` : "미연결",
      },
    },
  });
}
