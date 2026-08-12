import { notFound } from "next/navigation";
import { getLearnSession } from "@/learn/lib/auth";
import { getDemoLesson, DEMO_MINDMAP } from "@/learn/lib/demo-data";
import { LessonViewer } from "@/learn/components/learn/LessonViewer";

type Props = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { courseId, lessonId } = await params;
  const data = getDemoLesson(courseId, lessonId);
  return { title: data?.lesson.title ?? "강의" };
}

export default async function LessonPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const data = getDemoLesson(courseId, lessonId);
  if (!data) notFound();

  const session = await getLearnSession();

  return (
    <LessonViewer
      course={data.course}
      lesson={data.lesson}
      mindmapNodes={DEMO_MINDMAP}
      userId={session?.user?.id}
    />
  );
}
