import { NextResponse } from "next/server";
import { parseGeneratedJobCard } from "@/lib/job-card-ai";
import { pushJobCardToJobber } from "@/lib/jobber-api";
import { getJobberTokens } from "@/lib/jobber-tokens";
import { isJobberConfigured } from "@/lib/jobber-config";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (!isJobberConfigured()) {
    return NextResponse.json(
      {
        error:
          "Jobber app is not configured. See JOBBER_SETUP.md to add a Client ID.",
      },
      { status: 503 },
    );
  }

  const tokens = await getJobberTokens(session.sub);
  if (!tokens) {
    return NextResponse.json(
      { error: "Connect Jobber first." },
      { status: 400 },
    );
  }

  let card;
  try {
    const body = await request.json();
    card = parseGeneratedJobCard(body?.card ?? body);
  } catch {
    return NextResponse.json({ error: "Invalid Job Card data." }, { status: 400 });
  }

  try {
    const result = await pushJobCardToJobber(session.sub, card);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[jobber/push]", message);
    return NextResponse.json(
      { error: `Jobber push failed: ${message}` },
      { status: 500 },
    );
  }
}
