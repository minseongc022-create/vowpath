import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoCourse, formatDuration } from "@/learn/lib/demo-data";

type Props = { params: Promise<{ courseId: string }> };

export async function generateMetadata({ params }: Props) {
  const { courseId } = await params;
  const course = getDemoCourse(courseId);
  return { title: course?.title ?? "강의" };
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const course = getDemoCourse(courseId);
  if (!course) notFound();

  const firstLesson = course.lessons[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-8 learn-animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-learn-ink md:text-3xl">{course.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-learn-ink-muted md:text-base">
          {course.description}
        </p>
        {firstLesson && (
          <Link
            href={`/learn/courses/${course.slug}/lessons/${firstLesson.slug}`}
            className="mt-6 inline-flex h-12 items-center rounded-2xl bg-learn-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-learn-primary-hover"
          >
            {firstLesson.title}부터 시작
          </Link>
        )}
      </div>

      <h2 className="mb-3 text-lg font-bold text-learn-ink">커리큘럼</h2>
      <ol className="space-y-2">
        {course.lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              href={`/learn/courses/${course.slug}/lessons/${lesson.slug}`}
              className="flex items-center gap-4 rounded-2xl border border-learn-border bg-learn-surface p-4 transition-all hover:border-learn-primary/30 hover:shadow-learn-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-learn-muted text-sm font-bold text-learn-ink">
                {lesson.sortOrder}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-learn-ink">{lesson.title}</p>
                <p className="mt-0.5 text-xs text-learn-ink-subtle">
                  {formatDuration(lesson.durationSec)}
                </p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-learn-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
