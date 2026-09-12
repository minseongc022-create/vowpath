import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { claimNextRun } from "@/vibesafe/lib/runs/queue";
import { isRunnerAuthorized } from "@/vibesafe/lib/runs/runner-auth";

export async function POST(request: Request) {
  if (!isRunnerAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database not configured" }, { status: 503 });
  }

  const job = await claimNextRun();
  // 204에는 본문이 없다 — 워커는 상태 코드만 보고 "할 일 없음"을 안다.
  if (!job) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ ok: true, job });
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;
