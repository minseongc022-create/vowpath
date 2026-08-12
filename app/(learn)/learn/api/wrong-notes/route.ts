import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { resolveUserId } from "@/learn/lib/library/repository";
import {
  listWrongAnswers,
  resolveWrongAnswer,
} from "@/learn/lib/activity/file-store";

export async function GET() {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const wrongAnswers = await listWrongAnswers(userId);
    return NextResponse.json(wrongAnswers);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const body = (await request.json()) as { id: string };
    const ok = await resolveWrongAnswer(userId, body.id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
