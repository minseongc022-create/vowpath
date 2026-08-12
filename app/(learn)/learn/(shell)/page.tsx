import Link from "next/link";
import { Card } from "@/learn/components/ui/Card";
import { DEMO_COURSES } from "@/learn/lib/demo-data";

export default function LearnHomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12 learn-animate-in">
      {/* Hero */}
      <section className="mb-12 text-center md:text-left">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-learn-primary">
          <span className="learn-live-dot h-1.5 w-1.5 rounded-full bg-learn-primary" />
          AI 초밀착 학습 에이전트
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-learn-ink md:text-5xl">
          모든 기기에서,
          <br />
          <span className="text-learn-primary">가장 편한</span> 학습
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-learn-ink-muted md:text-lg">
          iPad 가로 모드도 완벽하게. 영상은 중앙에, 마인드맵과 커리큘럼은 우측에 —
          Class101의 불편함을 해결한 YouTube형 레이아웃.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
          <Link
            href="/learn/library"
            className="inline-flex h-13 min-h-[52px] items-center justify-center rounded-2xl bg-learn-primary px-8 text-base font-semibold text-white shadow-learn-sm transition-all hover:bg-learn-primary-hover active:scale-[0.98]"
          >
            저장소 열기
          </Link>
          <Link
            href="/learn/courses/ai-fundamentals/lessons/intro"
            className="inline-flex h-13 min-h-[52px] items-center justify-center rounded-2xl border border-learn-border bg-learn-surface px-8 text-base font-semibold text-learn-ink transition-all hover:bg-learn-muted active:scale-[0.98]"
          >
            강의 체험
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "AI 자료 소화 엔진",
            desc: "YouTube·PDF·유료 강의 텍스트를 청크 단위로 완벽 처리. 자막 누락 없는 전체 스크립트.",
            emoji: "🧠",
          },
          {
            title: "YouTube형 레이아웃",
            desc: "영상·자료는 중앙, 마인드맵·커리큘럼은 우측. iPad 가로 모드 최적화.",
            emoji: "📺",
          },
          {
            title: "실시간 동기화",
            desc: "Supabase + Prisma로 필기·플래너가 모든 기기에서 즉시 동기화.",
            emoji: "⚡",
          },
          {
            title: "한 번의 로그인",
            desc: "카카오·구글 소셜 로그인으로 폰·패드·PC 동일 경험.",
            emoji: "🔐",
          },
        ].map((f) => (
          <Card key={f.title} className="p-5">
            <span className="text-2xl">{f.emoji}</span>
            <h3 className="mt-3 text-base font-bold text-learn-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-learn-ink-muted">{f.desc}</p>
          </Card>
        ))}
      </section>

      {/* Course preview */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold text-learn-ink">인기 강의</h2>
          <Link href="/learn/courses" className="text-sm font-medium text-learn-primary">
            전체 보기 →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {DEMO_COURSES.map((course) => (
            <Link key={course.id} href={`/learn/courses/${course.slug}`}>
              <Card hover className="overflow-hidden">
                <div className="aspect-[16/9] bg-gradient-to-br from-learn-primary/20 to-learn-primary/5 flex items-center justify-center">
                  <span className="text-4xl">🎓</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-learn-ink">{course.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-learn-ink-muted">
                    {course.description}
                  </p>
                  <p className="mt-2 text-xs text-learn-ink-subtle">
                    {course.lessons.length}강
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
