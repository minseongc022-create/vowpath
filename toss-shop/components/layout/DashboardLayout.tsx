"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconCompetitors,
  IconDiscovery,
  IconHome,
  IconKeywords,
  IconMore,
  IconRankings,
  IconSettlements,
  IconSettings,
} from "@/toss-shop/components/icons/NavIcons";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

const PRIMARY_NAV = [
  { href: SP_ROUTES.dashboard, label: "홈", Icon: IconHome, match: (p: string) => p === SP_ROUTES.dashboard },
  { href: SP_ROUTES.discovery, label: "발굴", Icon: IconDiscovery, match: (p: string) => p.includes("/discovery") },
  { href: SP_ROUTES.keywords, label: "키워드", Icon: IconKeywords, match: (p: string) => p.includes("/keywords") },
  { href: SP_ROUTES.rankings, label: "랭킹", Icon: IconRankings, match: (p: string) => p.includes("/rankings") },
] as const;

const MORE_LINKS = [
  { href: SP_ROUTES.settlements, label: "정산", desc: "예상 vs 실제 입금", Icon: IconSettlements },
  { href: SP_ROUTES.competitors, label: "경쟁사", desc: "가격·랭킹 알림", Icon: IconCompetitors },
  { href: SP_ROUTES.settings, label: "설정", desc: "API 연동·동기화", Icon: IconSettings },
] as const;

function isMoreActive(pathname: string): boolean {
  return pathname.includes("/settlements") || pathname.includes("/competitors") || pathname.includes("/settings");
}

export function DashboardMobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreActive(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          className="ts-mobile-more-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="ts-mobile-more-sheet" role="dialog" aria-label="추가 메뉴">
          <p className="px-4 pb-2 text-xs font-semibold text-ts-muted">추가 기능</p>
          {MORE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="ts-mobile-more-item"
              onClick={() => setMoreOpen(false)}
            >
              <span className="ts-mobile-nav-icon">
                <item.Icon active={pathname.includes(item.href)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ts-ink">{item.label}</span>
                <span className="block text-xs text-ts-muted">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <nav className="ts-mobile-nav" aria-label="대시보드 메뉴">
        <div className="ts-mobile-nav-inner">
          {PRIMARY_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "ts-mobile-nav-item ts-mobile-nav-item-active" : "ts-mobile-nav-item"}
              >
                <span className="ts-mobile-nav-icon">
                  <item.Icon active={active} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={moreActive || moreOpen ? "ts-mobile-nav-item ts-mobile-nav-item-active" : "ts-mobile-nav-item"}
            aria-expanded={moreOpen}
          >
            <span className="ts-mobile-nav-icon">
              <IconMore active={moreActive || moreOpen} />
            </span>
            <span className="truncate">더보기</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export function DashboardPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sp-dashboard mx-auto max-w-6xl px-4 py-5 sm:py-8">
      <header className="ts-page-header mb-4">
        <h1 className="ts-page-title">{title}</h1>
        {description && <p className="ts-page-desc">{description}</p>}
      </header>
      {children}
    </div>
  );
}
