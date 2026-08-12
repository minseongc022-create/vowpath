import Link from "next/link";
import { Card } from "@/learn/components/ui/Card";
import { DEMO_COURSES } from "@/learn/lib/demo-data";

export const metadata = {
  title: "강의",
};

export default function LearnCoursesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-8 learn-animate-in">
      <h1 className="mb-6 text-2xl font-bold text-learn-ink">내 강의</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_COURSES.map((course) => (
          <Link key={course.id} href={`/learn/courses/${course.slug}`}>
            <Card hover className="h-full overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-learn-primary/15 to-transparent flex items-center justify-center">
                <span className="text-3xl">📚</span>
              </div>
              <div className="p-4">
                <h2 className="font-bold text-learn-ink">{course.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-learn-ink-muted">
                  {course.description}
                </p>
                <p className="mt-3 text-xs font-medium text-learn-primary">
                  {course.lessons.length}강 · 학습 시작 →
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
