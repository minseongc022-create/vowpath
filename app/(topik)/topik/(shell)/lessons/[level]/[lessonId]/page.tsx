import { notFound } from "next/navigation";
import { getLessonById } from "@/topik/lib/curriculum/lessons";
import { LessonViewer } from "@/topik/components/lessons/LessonViewer";
import type { TopikLevel } from "@/topik/types";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ level: string; lessonId: string }>;
}) {
  const { level, lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson || lesson.level !== Number(level)) notFound();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <LessonViewer lesson={lesson} />
    </main>
  );
}
