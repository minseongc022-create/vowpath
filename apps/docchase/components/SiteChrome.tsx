"use client";

import Link from "next/link";
import { useState } from "react";
import { SITE } from "@/lib/site";

const links = [
  { href: "/#how", label: "작동 방식" },
  { href: "/#why", label: "왜 쓰나요" },
  { href: "/#board", label: "현황판" },
  { href: "/pricing", label: "요금" },
];

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        solid
          ? "border-paper-line bg-paper-card/95 backdrop-blur"
          : "border-transparent bg-paper/80 backdrop-blur-md"
      }`}
    >
      <div className="sc-container flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link
          href="/"
          className="group flex items-baseline gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
            {SITE.name}
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/login" className="sc-btn-ghost hidden min-h-10 px-3 sm:inline-flex">
            로그인
          </Link>
          <Link href="/signup" className="sc-btn-primary min-h-10 px-3.5 text-sm sm:px-5">
            무료로 시작
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-ink/10 bg-white/70 text-ink md:hidden"
            aria-expanded={open}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <span className="text-lg leading-none" aria-hidden>
                ✕
              </span>
            ) : (
              <span className="flex flex-col gap-[5px]" aria-hidden>
                <span className="block h-[2px] w-4 rounded-full bg-ink" />
                <span className="block h-[2px] w-4 rounded-full bg-ink" />
                <span className="block h-[2px] w-4 rounded-full bg-ink" />
              </span>
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-paper-line bg-paper-card/98 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-11 rounded-xl px-3 py-3 text-sm font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="min-h-11 rounded-xl px-3 py-3 text-sm font-medium text-ink-muted"
              onClick={() => setOpen(false)}
            >
              로그인
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-paper-line bg-ink text-paper">
      <div className="sc-container flex flex-col gap-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl font-medium">{SITE.name}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-paper/70">
            세무·기장 사무소의 자료 요청 업무를 위한 운영 도구입니다. 세무 자문·기장 대행이 아닙니다.
          </p>
        </div>
        <div className="text-sm text-paper/60">
          <p>{SITE.supportEmail}</p>
          <p className="mt-1">© {new Date().getFullYear()} {SITE.name}</p>
        </div>
      </div>
    </footer>
  );
}
