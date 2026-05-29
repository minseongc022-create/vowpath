import { NextResponse } from "next/server";
import { getJobberTokens } from "@/lib/jobber-tokens";
import { isJobberConfigured } from "@/lib/jobber-config";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isJobberConfigured();
  const tokens = await getJobberTokens(session.sub);

  return NextResponse.json({
    configured,
    connected: Boolean(tokens),
    accountName: tokens?.accountName ?? null,
  });
}
