import { NextResponse } from "next/server";
import { getQuestions } from "@/topik/lib/quiz/questions";
import type { TopikLevel } from "@/topik/types";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level")
    ? (Number(searchParams.get("level")) as TopikLevel)
    : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 10;

  const questions = getQuestions({ level, limit });

  return NextResponse.json(questions, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
