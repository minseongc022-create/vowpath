import { NextResponse } from "next/server";
import { parseGeneratedJobCard } from "@/lib/job-card-ai";
import { pushJobCardToJobber } from "@/lib/jobber-api";
import { getJobberTokens } from "@/lib/jobber-tokens";
import { isJobberConfigured } from "@/lib/jobber-config";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isJobberConfigured()) {
    return NextResponse.json(
      {
        error:
          "Jobber 앱이 설정되지 않았습니다. JOBBER_SETUP.md를 참고해 Client ID를 추가하세요.",
      },
      { status: 503 },
    );
  }

  const tokens = await getJobberTokens(session.sub);
  if (!tokens) {
    return NextResponse.json(
      { error: "Jobber를 먼저 연결해 주세요." },
      { status: 400 },
    );
  }

  let card;
  try {
    const body = await request.json();
    card = parseGeneratedJobCard(body?.card ?? body);
  } catch {
    return NextResponse.json({ error: "Job Card 데이터가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const result = await pushJobCardToJobber(session.sub, card);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[jobber/push]", message);
    return NextResponse.json(
      { error: `Jobber 전송 실패: ${message}` },
      { status: 500 },
    );
  }
}
