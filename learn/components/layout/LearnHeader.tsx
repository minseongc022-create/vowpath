import Link from "next/link";
import { getLearnSession } from "@/learn/lib/auth";

export async function LearnHeader() {
  const session = await getLearnSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-learn-border bg-learn-surface/90 px-4 backdrop-blur-lg md:px-6">
      <Link href="/learn" className="flex items-center gap-2 shrink-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-learn-primary text-sm font-bold text-white">
          E
        </span>
        <span className="text-base font-bold tracking-tight text-learn-ink">
          EFFIROAD
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        {[
          { href: "/learn/library", label: "저장소" },
          { href: "/learn/courses", label: "강의" },
          { href: "/learn/planner", label: "플래너" },
          { href: "/learn/notes", label: "필기" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-3 py-2 text-sm font-medium text-learn-ink-muted transition-colors hover:bg-learn-muted hover:text-learn-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {session?.user ? (
          <Link
            href="/learn/courses/ai-fundamentals/lessons/intro"
            className="hidden sm:inline-flex h-9 items-center rounded-xl bg-learn-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-learn-primary-hover"
          >
            학습 계속
          </Link>
        ) : (
          <Link
            href="/learn/login"
            className="inline-flex h-9 items-center rounded-xl bg-learn-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-learn-primary-hover"
          >
            시작하기
          </Link>
        )}
        {session?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full ring-2 ring-learn-border"
          />
        ) : session?.user ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-learn-muted text-xs font-bold text-learn-ink">
            {(session.user.name?.[0] ?? "U").toUpperCase()}
          </span>
        ) : null}
      </div>
    </header>
  );
}
