import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { linkMaterialToLesson, resolveUserId } from "@/learn/lib/library/repository";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { id } = await params;
    const body = (await request.json()) as {
      courseSlug?: string;
      lessonSlug?: string;
    };

    if (!body.courseSlug || !body.lessonSlug) {
      return NextResponse.json({ error: "courseSlug and lessonSlug required" }, { status: 400 });
    }

    const material = await linkMaterialToLesson(
      userId,
      id,
      body.courseSlug,
      body.lessonSlug,
    );

    if (!material) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(material);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
