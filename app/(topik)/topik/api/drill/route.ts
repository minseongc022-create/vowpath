import { NextResponse } from "next/server";
import { buildDrillQuestions, type DrillType } from "@/topik/lib/quiz/drill";
import type { TopikLevel } from "@/topik/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "listening") as DrillType;
  const level = Number(searchParams.get("level") ?? "3") as TopikLevel;

  const validTypes: DrillType[] = ["listening", "reading", "order", "mixed"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }

  const questions = buildDrillQuestions(type, level);
  return NextResponse.json(questions);
}
