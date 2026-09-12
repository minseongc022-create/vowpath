import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { completeRun } from "@/vibesafe/lib/runs/complete";
import { isRunnerAuthorized } from "@/vibesafe/lib/runs/runner-auth";

const resultSchema = z.object({
  flowKey: z.string().min(1).max(80),
  status: z.enum(["passed", "failed", "skipped"]),
  startedAt: z.string().max(40),
  finishedAt: z.string().max(40),
  failedStepOrder: z.number().int().nullable().optional(),
  failedStepDescription: z.string().max(500).nullable().optional(),
  errorMessage: z.string().max(5000).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  // 400KB가 넘는 base64는 아예 받지 않는다 — 요청 본문이 부풀면 함수가 죽는다.
  screenshotBase64: z.string().max(420_000).nullable().optional(),
});

const schema = z.object({
  runId: z.string().min(1).max(60),
  claimToken: z.string().min(10).max(200),
  results: z.array(resultSchema).max(20),
  runError: z.string().max(5000).nullable().optional(),
});

export async function POST(request: Request) {
  if (!isRunnerAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const outcome = await completeRun(parsed.data);
  if (!outcome.ok) {
    // 이미 끝난 검사는 200으로 받아준다 — 워커가 재시도 루프에 빠지지 않게.
    const status = outcome.code === "ALREADY_DONE" ? 200 : 409;
    return NextResponse.json({ ok: false, error: outcome.error, code: outcome.code }, { status });
  }
  return NextResponse.json(outcome);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
