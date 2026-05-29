import { NextResponse } from "next/server";
import { generateJobCardFromNotes } from "@/lib/job-card-ai";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let notes = "";
  try {
    const body = await request.json();
    notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (notes.length < 10) {
    return NextResponse.json(
      { error: "콜 메모를 10자 이상 입력해 주세요." },
      { status: 400 },
    );
  }

  if (notes.length > 8000) {
    return NextResponse.json(
      { error: "메모가 너무 깁니다. 8,000자 이하로 줄여 주세요." },
      { status: 400 },
    );
  }

  try {
    const card = await generateJobCardFromNotes(notes);
    return NextResponse.json({ card });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    if (message === "OPENAI_API_KEY_MISSING") {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가한 뒤 서버를 재시작하세요.",
        },
        { status: 503 },
      );
    }
    if (message === "OPENAI_INSUFFICIENT_QUOTA") {
      return NextResponse.json(
        {
          error:
            "OpenAI 사용 한도(크레딧)가 없습니다. platform.openai.com → Billing에서 결제 수단 추가 후 $5 정도 충전해 주세요.",
        },
        { status: 402 },
      );
    }
    if (message === "OPENAI_INVALID_KEY") {
      return NextResponse.json(
        {
          error:
            "OpenAI API 키가 올바르지 않습니다. .env.local의 OPENAI_API_KEY를 새 키로 바꾼 뒤 서버를 재시작하세요.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Job Card를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
