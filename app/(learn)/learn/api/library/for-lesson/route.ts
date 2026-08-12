import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterialsForLesson, resolveUserId } from "@/learn/lib/library/repository";

export async function GET(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course");
    const lesson = searchParams.get("lesson");

    if (!course || !lesson) {
      return NextResponse.json({ error: "course and lesson required" }, { status: 400 });
    }

    const materials = await getMaterialsForLesson(userId, course, lesson);
    return NextResponse.json(materials);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
