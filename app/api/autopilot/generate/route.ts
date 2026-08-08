import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runCloudGenerateAll } from "@/lib/content-autopilot/run";
import { getJob, sessionValid, setJob } from "@/lib/content-autopilot/store";

const COOKIE = "autopilot_session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!(await sessionValid(token))) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const current = await getJob();
  if (current?.status === "running") {
    return NextResponse.json(current);
  }

  // Kick off — on Vercel run inline (Hobby timeout ~10-60s; mock is fast, LLM may need Pro)
  const started = {
    id: String(Date.now()),
    status: "running" as const,
    startedAt: new Date().toISOString(),
  };
  await setJob(started);

  // Run and return result (wait). Client polls status too.
  const result = await runCloudGenerateAll();
  return NextResponse.json(result);
}
