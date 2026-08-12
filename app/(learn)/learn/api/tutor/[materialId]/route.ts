import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { isLearnOpenAiReady } from "@/learn/lib/openai-config";
import { learnOpenAiTextCompletion } from "@/learn/lib/openai/chat";
import type { TutorMessage } from "@/learn/types/quiz";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;
    const body = (await request.json()) as { messages: TutorMessage[] };

    const material = await getMaterial(userId, materialId);
    if (!material) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (!isLearnOpenAiReady()) {
      return NextResponse.json({
        reply: "AI 튜터를 사용하려면 OpenAI API 키가 필요합니다.",
        openaiConfigured: false,
      });
    }

    const context = buildTutorContext(material);
    const recent = (body.messages ?? []).slice(-8);

    const reply = await learnOpenAiTextCompletion({
      messages: [
        {
          role: "system",
          content: `당신은 Lane Learn의 1:1 AI 튜터입니다.
- 아래 학습 자료 내용만 근거로 답하세요. 자료에 없으면 "자료에 해당 내용이 없어요"라고 말하세요.
- 짧고 친절하게, 토스 앱처럼 쉬운 말투로 설명하세요.
- 필요하면 bullet로 정리하세요.

[학습 자료]
${context}`,
        },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.4,
      timeoutMs: 45_000,
    });

    return NextResponse.json({ reply, openaiConfigured: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "OPENAI_API_KEY_MISSING") {
      return NextResponse.json({
        reply: "OpenAI API 키가 설정되지 않았습니다.",
        openaiConfigured: false,
      });
    }
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

function buildTutorContext(material: {
  title: string;
  fullTranscript?: string | null;
  analysis?: {
    summary: string;
    sections: { title: string; points: string[] }[];
    keyPoints: string[];
  } | null;
}): string {
  const parts = [`# ${material.title}`];
  if (material.analysis) {
    parts.push(material.analysis.summary);
    for (const sec of material.analysis.sections.slice(0, 8)) {
      parts.push(`## ${sec.title}`);
      for (const p of sec.points.slice(0, 6)) parts.push(`- ${p}`);
    }
  }
  if (material.fullTranscript) {
    parts.push("\n--- 원문 ---\n", material.fullTranscript.slice(0, 8000));
  }
  return parts.join("\n");
}
