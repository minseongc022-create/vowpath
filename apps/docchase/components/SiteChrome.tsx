import Link from "next/link";
import { SITE } from "@/lib/site";

const links = [
  { href: "/#how", label: "작동 방식" },
  { href: "/#why", label: "왜 쓰나요" },
  { href: "/#board", label: "현황판" },
  { href: "/pricing", label: "요금" },
];

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        solid
          ? "border-paper-line bg-paper-card/95 backdrop-blur"
          : "border-transparent bg-paper/70 backdrop-blur-md"
      }`}
    >
      <div className="sc-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {SITE.name}
          </span>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted sm:inline">
            {SITE.nameEn}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="sc-btn-ghost hidden sm:inline-flex">
            로그인
          </Link>
          <Link href="/signup" className="sc-btn-primary">
            무료로 시작
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-paper-line bg-ink text-paper">
      <div className="sc-container flex flex-col gap-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl font-semibold">{SITE.name}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-paper/70">
            세무·기장 사무소의 자료 요청 업무를 위한 운영 도구입니다. 세무 자문·기장 대행이 아닙니다.
          </p>
        </div>
        <div className="text-sm text-paper/60">
          <p>{SITE.supportEmail}</p>
          <p className="mt-1">© {new Date().getFullYear()} {SITE.nameEn}</p>
        </div>
      </div>
    </footer>
  );
}
